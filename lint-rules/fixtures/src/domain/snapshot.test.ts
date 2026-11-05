it('matches a snapshot', () => {
  expect({ cash: 0 }).toMatchSnapshot();
});

it.only('is focused', () => {
  expect(1).toBe(1);
});
