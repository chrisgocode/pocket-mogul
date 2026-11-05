import { definePlugin, defineRule, type Context, type ESTree, type Scope } from '@oxlint/plugins';

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

const MIN_STATE_PIECES = 2;

function isLet(definition: { parent: ESTree.Node | null }): boolean {
  return definition.parent?.type === 'VariableDeclaration' && definition.parent.kind === 'let';
}

function closureStateNames(scope: Scope): string[] {
  return scope.variables
    .filter((variable) => variable.defs.some(isLet))
    .filter((variable) =>
      variable.references.some(
        (reference) => reference.isWrite() && reference.from.variableScope !== scope,
      ),
    )
    .map((variable) => variable.name);
}

function booleanFieldName(member: ESTree.Node): string | undefined {
  if (member.type !== 'TSPropertySignature' || member.key.type !== 'Identifier') return undefined;
  return member.typeAnnotation?.typeAnnotation.type === 'TSBooleanKeyword'
    ? member.key.name
    : undefined;
}

function isUseStateCall(node: ESTree.CallExpression): boolean {
  return node.callee.type === 'Identifier' && node.callee.name === 'useState';
}

function holdsBoolean(node: ESTree.CallExpression): boolean {
  const [initial] = node.arguments;
  const [typeArgument] = node.typeArguments?.params ?? [];
  const startsAsBoolean = initial?.type === 'Literal' && typeof initial.value === 'boolean';
  return startsAsBoolean || typeArgument?.type === 'TSBooleanKeyword';
}

function reportClosureState(context: Context, node: ESTree.Node): void {
  const names = closureStateNames(context.sourceCode.getScope(node));
  if (names.length < MIN_STATE_PIECES) return;
  const data = { count: String(names.length), names: names.join(', ') };
  context.report({ node, messageId: 'closureState', data });
}

function reportFlagFields(
  context: Context,
  type: { node: ESTree.Node; members: readonly ESTree.Node[] },
): void {
  const names = type.members.flatMap((member) => booleanFieldName(member) ?? []);
  if (names.length < MIN_STATE_PIECES) return;
  const data = { count: String(names.length), names: names.join(', ') };
  context.report({ node: type.node, messageId: 'flagFields', data });
}

function booleanHookCounter(context: Context) {
  const countsByFunction: number[] = [];
  return {
    enter: () => countsByFunction.push(0),
    exit: (node: ESTree.Node) => {
      const count = countsByFunction.pop() ?? 0;
      if (count < MIN_STATE_PIECES) return;
      context.report({ node, messageId: 'booleanHooks', data: { count: String(count) } });
    },
    count: (node: ESTree.CallExpression) => {
      const innermost = countsByFunction.length - 1;
      if (innermost < 0 || !isUseStateCall(node) || !holdsBoolean(node)) return;
      countsByFunction[innermost] = (countsByFunction[innermost] ?? 0) + 1;
    },
  };
}

const noImplicitStateMachine = defineRule({
  meta: {
    type: 'suggestion',
    messages: {
      closureState:
        'This closure keeps {{count}} pieces of mutable state ({{names}}) that its inner functions change separately, so they can drift into combinations that make no sense. Hold one `let state` typed as a discriminated union, and move between its cases in one place.',
      flagFields:
        'This type has {{count}} boolean fields ({{names}}). Together they allow impossible combinations. Replace them with one `status` field typed as a union of the real states.',
      booleanHooks:
        'This hook keeps {{count}} boolean useState flags. Replace them with one useState over a union of the real states.',
    },
    schema: [],
  },
  create(context) {
    const hooks = booleanHookCounter(context);
    const exitFunction = (node: ESTree.Node) => {
      reportClosureState(context, node);
      hooks.exit(node);
    };
    return {
      FunctionDeclaration: hooks.enter,
      FunctionExpression: hooks.enter,
      ArrowFunctionExpression: hooks.enter,
      'FunctionDeclaration:exit': exitFunction,
      'FunctionExpression:exit': exitFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      'Program:exit': (node) => reportClosureState(context, node),
      CallExpression: hooks.count,
      TSTypeLiteral: (node) => reportFlagFields(context, { node, members: node.members }),
      TSInterfaceBody: (node) => reportFlagFields(context, { node, members: node.body }),
    };
  },
});

export default definePlugin({
  meta: { name: 'pocket-mogul' },
  rules: {
    'no-comments': noComments,
    'no-nondeterminism': noNondeterminism,
    'no-implicit-state-machine': noImplicitStateMachine,
  },
});
