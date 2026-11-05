import { definePlugin, defineRule, type ESTree } from '@oxlint/plugins';

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

const NONDETERMINISTIC_MEMBERS = new Set(['Date.now', 'Math.random', 'performance.now']);
const NONDETERMINISTIC_CALLS = new Set(['setTimeout', 'setInterval', 'requestAnimationFrame']);

function memberName(node: ESTree.Node): string | undefined {
  if (node.type !== 'MemberExpression' || node.computed) return undefined;
  if (node.object.type !== 'Identifier' || node.property.type !== 'Identifier') return undefined;
  return `${node.object.name}.${node.property.name}`;
}

const noNondeterminism = defineRule({
  meta: {
    type: 'problem',
    messages: {
      noNondeterminism:
        '{{name}} makes results depend on the real clock or randomness. Take time from the injected Clock and randomness from the seeded market streams, so the same save and time always give the same result.',
    },
    schema: [],
  },
  create(context) {
    const report = (node: ESTree.Node, name: string) =>
      context.report({ node, messageId: 'noNondeterminism', data: { name } });
    return {
      MemberExpression(node) {
        const name = memberName(node);
        if (name !== undefined && NONDETERMINISTIC_MEMBERS.has(name)) report(node, name);
      },
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Date')
          report(node, 'new Date()');
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === 'Identifier' && NONDETERMINISTIC_CALLS.has(callee.name)) {
          report(node, callee.name);
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: 'pocket-mogul' },
  rules: { 'no-comments': noComments, 'no-nondeterminism': noNondeterminism },
});
