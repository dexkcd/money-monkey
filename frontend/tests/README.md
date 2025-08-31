# Frontend Testing Guide

This document provides comprehensive information about the testing setup and strategies for the Expense Tracker frontend application.

## Testing Stack

- **Unit/Component Tests**: Vitest + React Testing Library + Jest DOM
- **Integration Tests**: Playwright
- **Accessibility Tests**: vitest-axe
- **Visual Regression Tests**: Playwright with screenshot comparison
- **Test Runner**: Custom Node.js script for orchestrating all test types

## Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── **/__tests__/          # Component unit tests
│   └── test/
│       ├── setup.ts               # Test environment setup
│       └── utils.tsx              # Test utilities and helpers
├── tests/
│   ├── accessibility/             # Accessibility tests
│   ├── e2e/                      # End-to-end integration tests
│   └── visual/                   # Visual regression tests
├── scripts/
│   └── test-runner.js            # Custom test orchestration
└── test-results/                 # Generated test outputs
```

## Running Tests

### Individual Test Types

```bash
# Unit and component tests
npm run test

# Watch mode for development
npm run test:watch

# Test coverage
npm run test:coverage

# Integration tests
npm run test:e2e

# Accessibility tests
npm run test:accessibility

# Visual regression tests
npm run test:visual

# Component tests only
npm run test:components
```

### Using the Test Runner

```bash
# Run all tests sequentially
npm run test:all

# Run all tests in parallel (faster)
npm run test:all:parallel

# Run specific test type
npm run test:runner unit
npm run test:runner integration
npm run test:runner accessibility
npm run test:runner visual
npm run test:runner coverage

# Run with verbose output
node scripts/test-runner.js unit --verbose

# Continue on failure (don't stop on first failure)
node scripts/test-runner.js --all --continue-on-failure
```

## Test Categories

### 1. Unit and Component Tests

**Location**: `src/components/**/__tests__/`

**Purpose**: Test individual components in isolation

**Coverage**:
- Component rendering
- Props handling
- User interactions
- State management
- Event handling
- Form validation
- Error states

**Example**:
```typescript
import { render, screen } from '../../../test/utils';
import ExpenseForm from '../ExpenseForm';

test('should render form with required fields', () => {
  render(<ExpenseForm isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);
  
  expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
});
```

### 2. Integration Tests

**Location**: `tests/e2e/`

**Purpose**: Test complete user workflows and interactions

**Coverage**:
- Authentication flows
- Expense management workflows
- Budget management
- Navigation between pages
- API integration
- Error handling

**Example**:
```typescript
test('should create new expense successfully', async ({ page }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: /add expense/i }).click();
  
  await page.getByLabel(/amount/i).fill('25.99');
  await page.getByLabel(/description/i).fill('Coffee shop');
  await page.getByRole('button', { name: /add expense/i }).click();
  
  await expect(page.getByText('Coffee shop')).toBeVisible();
});
```

### 3. Accessibility Tests

**Location**: `tests/accessibility/`

**Purpose**: Ensure WCAG compliance and screen reader compatibility

**Coverage**:
- ARIA attributes
- Keyboard navigation
- Focus management
- Color contrast
- Form labels
- Semantic HTML
- Screen reader support

**Example**:
```typescript
test('should have no accessibility violations', async () => {
  const { container } = render(<ExpenseForm {...props} />);
  const results = await axe(container, axeConfig);
  expect(results).toHaveNoViolations();
});
```

### 4. Visual Regression Tests

**Location**: `tests/visual/`

**Purpose**: Detect unintended visual changes

**Coverage**:
- Page layouts
- Component appearance
- Responsive design
- Different browser rendering
- Error states
- Loading states

**Example**:
```typescript
test('Dashboard page visual regression', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="dashboard-content"]');
  
  await expect(page).toHaveScreenshot('dashboard-full-page.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
```

## Test Utilities

### Custom Render Function

The `render` function from `src/test/utils.tsx` wraps components with necessary providers:

```typescript
import { render } from '../test/utils';

// Automatically includes:
// - BrowserRouter
// - AuthProvider
// - CategoriesProvider  
// - NotificationProvider
```

### Mock Data Factories

Pre-defined mock data for consistent testing:

```typescript
import { mockExpense, mockBudget, mockCategory } from '../test/utils';

// Use in tests
const expense = { ...mockExpense, amount: 50.00 };
```

### API Mocking

Tests use MSW (Mock Service Worker) patterns for API mocking:

```typescript
// In Playwright tests
await page.route('**/api/v1/expenses', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([mockExpense])
  });
});
```

## Coverage Requirements

- **Minimum Coverage**: 80% for lines, functions, branches, and statements
- **Component Coverage**: All major components must have tests
- **Integration Coverage**: All user workflows must be tested
- **Accessibility Coverage**: All interactive components must pass axe tests

## Best Practices

### Writing Tests

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests clearly
3. **User-Centric Testing**: Test from user perspective, not implementation
4. **Accessibility First**: Include accessibility checks in component tests
5. **Mock External Dependencies**: Mock APIs, services, and external libraries

### Component Testing

```typescript
// ✅ Good - Tests user behavior
test('should show error when amount is invalid', async () => {
  const user = userEvent.setup();
  render(<ExpenseForm {...props} />);
  
  await user.type(screen.getByLabelText(/amount/i), '-10');
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
});

// ❌ Bad - Tests implementation details
test('should set error state when validateAmount returns false', () => {
  // Testing internal state instead of user-visible behavior
});
```

### Integration Testing

```typescript
// ✅ Good - Tests complete workflow
test('expense creation workflow', async ({ page }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: /add expense/i }).click();
  
  // Fill form
  await page.getByLabel(/amount/i).fill('25.99');
  await page.getByLabel(/description/i).fill('Coffee');
  await page.getByLabel(/category/i).selectOption('Restaurants');
  
  // Submit and verify
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Coffee')).toBeVisible();
});
```

## Debugging Tests

### Component Tests

```bash
# Run tests in watch mode
npm run test:watch

# Run with UI (Vitest UI)
npm run test:ui

# Debug specific test
npm run test -- --reporter=verbose ExpenseForm
```

### Integration Tests

```bash
# Run with browser UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npx playwright test --headed

# Debug specific test
npx playwright test --debug auth.spec.ts
```

### Visual Tests

```bash
# Update screenshots
npx playwright test tests/visual --update-snapshots

# Compare screenshots
npx playwright show-report
```

## Continuous Integration

Tests are configured to run in CI with:

- **Parallel Execution**: Tests run in parallel for speed
- **Browser Matrix**: Tests run on Chrome, Firefox, Safari
- **Coverage Reports**: Generated and uploaded as artifacts
- **Visual Diff Reports**: Screenshot comparisons available
- **Accessibility Reports**: WCAG compliance reports

## Troubleshooting

### Common Issues

1. **Flaky Tests**: Use `waitFor` and proper selectors
2. **Timeout Issues**: Increase timeout for slow operations
3. **Mock Issues**: Ensure mocks are properly reset between tests
4. **Visual Differences**: Check for animations and dynamic content

### Performance

- **Parallel Execution**: Use `--parallel` flag for faster runs
- **Test Isolation**: Each test runs in isolation for reliability
- **Smart Retries**: Failed tests are retried automatically in CI
- **Selective Testing**: Run only changed components during development

## Contributing

When adding new features:

1. **Write Tests First**: Follow TDD when possible
2. **Test All Interactions**: Cover happy path and error cases
3. **Include Accessibility**: Add axe tests for new components
4. **Update Visual Tests**: Add screenshots for new UI components
5. **Document Edge Cases**: Comment complex test scenarios

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)