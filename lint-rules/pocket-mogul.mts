import { definePlugin, defineRule } from '@oxlint/plugins';

const noComments = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      noComments:
        'Comments are not allowed. Make the code explain itself: rename, extract a well-named function or constant, or restructure.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: 'noComments' });
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: 'pocket-mogul' },
  rules: { 'no-comments': noComments },
});
