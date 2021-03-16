module.exports = {
  settings: {
    'vetur.useWorkspaceDependencies': true,
    'vetur.validation.template': false,
  },
  projects: [
    { root: './restream/dashboard' },
    { root: './rabbitmq/dashboard' },
    { root: './mediabox/dashboard' },
    { root: './mediabox/graphics' },
    { root: './countdown/dashboard' },
    { root: './countdown/graphics' },
  ]
}
