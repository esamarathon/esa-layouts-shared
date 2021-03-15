module.exports = {
  settings: {
    'vetur.useWorkspaceDependencies': true,
    'vetur.validation.template': false,
  },
  projects: [
    { root: './restream/dashboard' },
    { root: './rabbitmq/dashboard' },
    { root: './mediabox/dashboard' },
    { root: './countdown/dashboard' },
    { root: './countdown/graphics' },
  ]
}
