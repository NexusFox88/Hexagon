/** Existing user-authorized sandbox benchmark project; never a deployment. */
export const vercelTestConfig = {
  project_id: process.env.HEXAGON_VERCEL_PROJECT_ID ?? 'prj_bgSVMWuV2wZ6BnrSXrbr8UlL3qB7',
  team_id: process.env.HEXAGON_VERCEL_TEAM_ID ?? 'team_4dWacL8XOriOF6EAIAGZ2X22',
  vcpus: 2,
};
