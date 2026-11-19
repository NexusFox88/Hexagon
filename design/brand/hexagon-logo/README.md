# Hexagon — Modular H

主标由两个独立执行边界与中央控制节点组成。外缘形成六边形轮廓，内部读作抽象 H。三个部分之间保留透明间隙；强调色仅用于控制节点，不代表特定供应商数量。

- `hexagon.svg`：透明背景深色主标，用于浅色界面。
- `hexagon-dark.svg`：透明背景冷白主标，用于深色界面。
- `hexagon-accent.svg` / `hexagon-accent-dark.svg`：青色控制节点版本。
- `hexagon-currentcolor.svg`：供 inline SVG 使用，继承 CSS color；通过 img 引用不会继承宿主颜色。
- `hexagon-16.svg`：16px 光学校正版，浅色背景使用。
- `preview.svg` / `preview.png`：明暗背景、文字搭配和原生小尺寸效果图。预览的文字使用系统无衬线字体，正式主标不依赖字体。

SVG 均由原生 path 构成，无栅格、脚本、滤镜、外部依赖和背景。主标 viewBox 0 0 128 128；内建至少 16 单位左右留白。不要拉伸或增加阴影；深色背景显式使用白色版本。最低建议尺寸 16px；对比度不足时使用纯单色版本。

本轮交付为独立品牌设计文件，未替换 Console 或其他产品资产。
