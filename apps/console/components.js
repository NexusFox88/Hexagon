import { t, UiError } from './i18n.js';
// Application-owned controls: no native selects, dialogs or validation bubbles.
let sequence = 0;
export class Select extends HTMLElement {
    static get observedAttributes(){return ['aria-label'];}
    attributeChangedCallback(name,oldValue,value){if(this.trigger&&name==='aria-label')this.trigger.setAttribute(name,value);}

    connectedCallback() {
        if (this.trigger) {
            document.addEventListener('pointerdown', this.outside);
            return;
        }
        this.classList.add('select');
        this.trigger = document.createElement('button');
        this.trigger.type = 'button';
        this.trigger.className = 'select-trigger';
        this.trigger.setAttribute('role', 'combobox');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.setAttribute('aria-haspopup', 'listbox');
        this.list = document.createElement('div');
        this.list.className = 'select-options';
        this.list.id = `options-${++sequence}`;
        this.list.setAttribute('role', 'listbox');
        this.list.hidden = true;
        this.trigger.setAttribute('aria-controls', this.list.id);
        this.trigger.setAttribute('aria-label', this.getAttribute('aria-label') || document.querySelector(`label[for="${this.id}"]`)?.textContent || t("ui.select_an_option"));
        this.append(this.trigger, this.list);
        this.trigger.onclick = () => this.toggle();
        this.addEventListener('keydown', event => this.key(event));
        this.outside = event => { if (!this.contains(event.target))
            this.close(); };
        document.addEventListener('pointerdown', this.outside);
        this.setOptions(this.items || []);
    }
    disconnectedCallback() { document.removeEventListener('pointerdown', this.outside); }
    setOptions(items) {
        this.items = items;
        if (!items.some(item => item.value === this.current))
            this.current = items[0]?.value ?? '';
        if (!this.trigger)
            return;
        this.list.replaceChildren();
        for (const item of items) {
            const option = document.createElement('button');
            option.type = 'button';
            option.setAttribute('role', 'option');
            const text = document.createElement('span');
            text.className = 'select-option-label';
            text.textContent = item.label;
            option.append(text);
            option.dataset.value = item.value;
            option.tabIndex = -1;
            option.onclick = () => { this.value = item.value; this.close(); this.trigger.focus(); this.dispatchEvent(new Event('change', { bubbles: true })); if(!this.isConnected&&this.id)document.getElementById(this.id)?.focus(); };
            this.list.append(option);
        }
        this.paint();
    }
    filter(query = '') {
        const needle = query.trim().toLocaleLowerCase();
        for (const option of this.list.children)
            option.hidden = !`${option.textContent} ${option.dataset.value}`.toLocaleLowerCase().includes(needle);
        return [...this.list.children].filter(option => !option.hidden).length;
    }
    get value() { return this.current ?? ''; }
    set value(value) { this.current = value; this.paint(); }
    get disabled() { return Boolean(this.locked); }
    set disabled(value) { this.locked = value; if (this.trigger)
        this.trigger.disabled = value; if (value)
        this.close(); }
    paint() {
        if (!this.trigger)
            return;
        const text = document.createElement('span');
        text.className = 'select-value';
        text.textContent = this.items.find(item => item.value === this.value)?.label || t("ui.select_an_option");
        this.trigger.replaceChildren(text);
        this.trigger.disabled = this.disabled;
        [...this.list.children].forEach(node => node.setAttribute('aria-selected', String(node.dataset.value === this.value)));
    }
    toggle() {
        if (this.disabled)
            return;
        if (!this.list.hidden) {
            this.close();
            return;
        }
        document.querySelectorAll('hx-select').forEach(node => { if (node !== this)
            node.close(); });
        this.list.hidden = false;
        this.trigger.setAttribute('aria-expanded', 'true');
        let boundary=this.parentElement;
        while(boundary&&!/(auto|scroll|hidden)/.test(getComputedStyle(boundary).overflowY))boundary=boundary.parentElement;
        const bounds=boundary?.getBoundingClientRect();
        const rect = this.trigger.getBoundingClientRect();
        const below = Math.min(innerHeight, bounds?.bottom ?? innerHeight) - rect.bottom - 12;
        const above = rect.top - Math.max(0, bounds?.top ?? 0) - 12;
        const up = below < 180 && above > below;
        this.list.classList.toggle('opens-up', up);
        this.list.style.maxHeight = `${Math.max(70, Math.min(235, up ? above : below))}px`;
        const selected = [...this.list.children].find(node => !node.hidden && node.dataset.value === this.value) || [...this.list.children].find(node => !node.hidden);
        selected?.focus();
    }
    close() { if (!this.list)
        return; this.list.hidden = true; this.trigger.setAttribute('aria-expanded', 'false'); }
    focus() { this.trigger?.focus(); }
    key(event) {
        if (event.key === 'Escape' && !this.list.hidden) {
            event.preventDefault();
            event.stopPropagation();
            this.close();
            this.trigger.focus();
            return;
        }
        if (event.key === 'Tab') {
            if (!this.list.hidden) this.trigger.focus();
            this.close();
            return;
        }
        const options = [...this.list.children].filter(node => !node.hidden);
        let index = options.indexOf(document.activeElement);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (this.list.hidden) {
                this.toggle();
                return;
            }
            index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
            options[index]?.focus();
        }
        else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !this.list.hidden) {
            const match = options.find(node => node.textContent.toLowerCase().startsWith(event.key.toLowerCase()));
            match?.focus();
        }
    }
}
customElements.define('hx-select', Select);
let activeModal = null, returnFocus = null, confirmationText = null, pointerTrigger = null;
document.addEventListener("pointerdown",event=>{pointerTrigger=event.target.closest?.("button,a[href],summary");},true);
document.addEventListener('localechange',()=>{if(confirmationText&&!document.getElementById('confirmation').hidden)document.getElementById('confirm-description').textContent=typeof confirmationText==='function'?confirmationText():confirmationText;});
const focusable = 'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]';
export function openModal(id) {
    const modal = document.getElementById(id);
    returnFocus = document.activeElement?.matches(focusable) ? document.activeElement : pointerTrigger;
    activeModal = modal;
    modal.hidden = false;
    const body = modal.querySelector('.dialog-body');
    if (body)
        body.scrollTop = 0;
    document.getElementById('app-shell').inert = true;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {const first=[...(body??modal).querySelectorAll(focusable)].find(node=>node.getClientRects().length)??[...modal.querySelectorAll(focusable)].find(node=>node.getClientRects().length);first?.focus();});
}
export function closeModal(id) {
    const modal = document.getElementById(id);
    modal.hidden = true;
    modal.querySelectorAll('hx-select').forEach(node => node.close());
    document.getElementById('app-shell').inert = false;
    document.body.classList.remove('modal-open');
    activeModal = null;
    modal.dispatchEvent(new Event('close'));
    if (returnFocus?.isConnected && returnFocus.matches(focusable) && returnFocus.getClientRects().length)
        returnFocus.focus();
    else document.querySelector('#create:not([hidden])')?.focus();
}
export function modalOpen() { return Boolean(activeModal); }
document.addEventListener('keydown', event => {
    if (!activeModal)
        return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(activeModal.id);
        return;
    }
    if (event.key === 'Tab') {
        const nodes = [...activeModal.querySelectorAll(focusable)].filter(node => node.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    }
});
export function confirmAction(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmation');
        confirmationText=message;document.getElementById('confirm-description').textContent = typeof message==='function'?message():message;
        let accepted = false;
        const done = () => { modal.removeEventListener('close', done); confirmationText=null;resolve(accepted); };
        modal.addEventListener('close', done);
        document.getElementById('confirm-cancel').onclick = () => closeModal('confirmation');
        document.getElementById('confirm-accept').onclick = () => { accepted = true; closeModal('confirmation'); };
        openModal('confirmation');
        requestAnimationFrame(() => document.getElementById('confirm-cancel').focus());
    });
}
export function validateForm(form) {
    form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    for (const input of form.querySelectorAll('input,textarea')) {
        if (input.disabled || !input.getClientRects().length)
            continue;
        const label = () => document.querySelector(`label[for="${input.id}"]`)?.textContent.replace(/\s*\*\s*$/, '').trim() || t("ui.this_field");
        let message = '';
        if (input.required && !input.value.trim())
            message = new UiError("ui.enter_label", { label });
        if (input.value && input.type === 'url') {
            try {
                const url = new URL(input.value);
                if (!['http:', 'https:'].includes(url.protocol))
                    throw Error();
            }
            catch {
                message = new UiError("ui.enter_a_valid_label_http_or_https", { label });
            }
        }
        if (input.dataset.numeric && (!/^\d+$/.test(input.value) || Number(input.value) <= 0))
            message = new UiError("ui.label_must_be_a_positive_integer", { label });
        if (message) {
            input.setAttribute('aria-invalid', 'true');
            input.focus();
            throw message;
        }
    }
}

export function markServerFields(form, fields, mapping={}) {
    form.querySelectorAll('[data-server-field-error]').forEach(node=>node.remove());
    let first;
    for(const path of fields??[]){
        const id=mapping[path]??mapping[path.replace(/^definition\./,'')];
        const input=id?form.querySelector(`#${CSS.escape(id)}`):null;
        if(!input)continue;
        input.setAttribute('aria-invalid','true');
        const message=document.createElement('p');message.className='inline-error';message.dataset.serverFieldError='';message.id=`${id}-error`;message.textContent=t('ui.check_this_field');input.setAttribute('aria-describedby',message.id);input.after(message);first??=input;
    }
    first?.focus();
}
