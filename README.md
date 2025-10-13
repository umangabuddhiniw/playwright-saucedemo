🧪 SauceDemo Playwright Automation Framework

🚀 Overview
A comprehensive test automation framework for SauceDemo e-commerce platform using Playwright with TypeScript. This framework implements enterprise-grade testing practices including Page Object Model, data-driven testing, and sophisticated reporting with visual documentation.

✨ Key Features
•	🔧 Multi-User Testing - Tests 6 different user types with conditional execution
•	📊 Data-Driven Approach - JSON-based credential management with TypeScript types
•	🎯 Page Object Model - Clean, maintainable architecture
•	📸 Visual Documentation - Screenshot galleries and strategic video coverage
•	📈 Interactive Reporting - HTML reports with modal image viewing
•	⚡ Conditional Execution - Smart test flows based on user capabilities
•	🛡️ Comprehensive Error Handling - Graceful failure management

🏗️ Project Structure
text
project-root/
├── .github/
│   └── workflows/
│       └── playwright.yml
├── data/
│   └── credentials.json
├── src/
│   ├── pages/
│   │   ├── CartPage.ts
│   │   ├── CheckoutCompletePage.ts
│   │   ├── CheckoutInfoPage.ts
│   │   ├── LoginPage.ts
│   │   └── OverviewPage.ts
│   │   └── ProductsPage.ts
│   ├── tests/
│   │   ├── error-user-video.spec.ts
│   │   ├── locked-user-video.spec.ts
│   │   ├── problem-user-video.spec.ts
│   │   ├── purchaseFlow.spec.ts
│   │   └── standard-user-video.spec.ts
│   ├── utils/
│   │   ├── customWait.ts
│   │   ├── logger.ts
│   │   ├── reportGenerator.ts
│   │   ├── results-collector.ts
│   │   ├── screenshotHelper.ts
│   │   └── testRunner.ts
│   └── types/
│       └── credentials.d.ts
├── .gitignore
├── global-setup.ts
├── package.json
├── playwright.config.ts
├── README.md
└── tsconfig.json

🎪 Multi-User Test Automation with Conditional Execution
The framework intelligently loops through all user types and executes conditional checkout flows:
 
User Type	                 Test Focus	                Visual Documentation
✅ standard_user	            Complete happy path flow.    Full video documentation
⚠️ problem_user	             Broken images & UI issues	  Video of visual glitches
🚫 locked_out_user	         Error handling & validation  Video of lockout states
🧨 error_user	             UI error states & recovery	  Video of scrambled layouts
⏱️ performance_glitch_user	 Performance handling	      Screenshots only (delays)
👁️ visual_user	              Standard flow validation	   Screenshots only          
                                                          (identical UI)
🛠️ Quick Start
Prerequisites
•	Node.js 16+
•	npm or yarn

Installation

# Clone repository
git clone https://github.com/umangabuddhiniw/playwright-saucedemo
cd playwright-saucedemo

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

Running Tests

# Run all tests in headless mode
npx playwright test

# Run tests with visible browser UI
npx playwright test --headed

# Run specific test file
npx playwright test purchaseFlow.spec.ts --headed

# Debug mode
npx playwright test --debug

Viewing Reports

# Open interactive HTML report
npx playwright show-report

# Check test artifacts

test-results/
├── screenshots/    # Step-by-step visual documentation
├── reports/        # HTML reports with galleries
└── logs/          # Detailed execution logs

📊 Test Scenarios

✅ Standard User Flow
(https://github.com/umangabuddhiniw/playwright-saucedemo/issues/1#issue-3507780319)

•	Complete purchase journey with 2 most expensive products
•	Dynamic product selection and cart management
•	Total calculation validation and order completion

⚠️ Problem User Validation
(https://github.com/umangabuddhiniw/playwright-saucedemo/issues/2#issue-3507812662

•	Detection and handling of broken images
•	UI issue documentation and continued operation
•	Graceful degradation testing

🚫 Locked Out User Handling
(https://github.com/umangabuddhiniw/playwright-saucedemo/issues/3#issue-3507842409)

•	Authentication failure scenarios
•	Proper error message validation
•	Security testing

🧨 Error User Scenarios
(https://github.com/umangabuddhiniw/playwright-saucedemo/issues/4#issue-3507868650)

•	Random UI error state management
•	Error recovery mechanisms
•	System stability under failure conditions


Generated an HTML report with test results-SauceDemo Automation Test Report

(https://github.com/umangabuddhiniw/playwright-saucedemo/issues/5#issue-3507919603)


🎨 Strategic Visual Documentation

Video Coverage (Dynamic Behaviors)
•	error_user: UI error states and scrambled layouts
•	problem_user: Broken images and visual glitches
•	locked_out_user: Authentication error flows
•	standard_user: Ideal user journey demonstration

Screenshot Coverage (All Users)
•	Step-by-step state documentation for ALL user types
•	Comprehensive UI state capture at each test milestone
•	Efficient storage and quick review capabilities

🔧 Technical Implementation

Data-Driven Testing
typescript
// Type-safe credential handling
interface User {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  postalCode: string;
}

// Conditional execution based on user type
users.forEach(user => {
  test(`Checkout flow - ${user.username}`, async ({ page }) => {
    // User-specific test logic
  });
});
Dynamic Product Selection
typescript
// Automatically selects 2 most expensive products
const products = await page.locator('.inventory_item').all();
const pricedProducts = await Promise.all(
  products.map(async (product) => ({
    element: product,
    price: await getProductPrice(product)
  }))
);
const expensiveProducts = pricedProducts
  .sort((a, b) => b.price - a.price)
  .slice(0, 2);

Cart & Checkout Validation
•	Product Verification: Asserts correct product names and prices in cart
•	Cart Management: Removes one item and re-verifies the cart contents
•	Price Calculations: Calculates subtotal and compares with displayed value
•	Tax Validation: Validates tax calculations and final totals accuracy
•	Order Summary: Comprehensive order review before completion

Error & Edge Case Handling
•	Graceful Degradation: Handles missing elements or network delays smoothly
•	Custom Wait Strategies: Intelligent retry logic with configurable timeouts
•	User-Specific Behavior: Conditional execution based on user capabilities
•	Comprehensive Error Reporting: Detailed error context and recovery mechanisms
•	Performance Tolerance: Handles slow loading with performance_glitch_user

Custom Reporting System
•	Interactive HTML reports with search functionality
•	Screenshot galleries with modal viewing
•	Performance metrics and success rate analytics

📈 Test Results & Artifacts

After test execution, you get:
1.	📊 HTML Report: Interactive dashboard with test results
2.	🖼️ Screenshot Gallery: Visual documentation of each test step
3.	📝 Execution Logs: Detailed step-by-step logging
4.	🎥 Strategic Videos: Dynamic behavior documentation for key users

🏆 Framework Highlights

Feature	Implementation
Code Quality	TypeScript, Clean Architecture, POM Pattern
Test Coverage	6 User Types, Positive/Negative Scenarios
Error Handling	Comprehensive Exception Management
Reporting	Interactive HTML + Visual Documentation
CI/CD Ready	GitHub Actions Workflow Included

🤝 Contributing
Feel free to contribute to this project by:
•	Reporting issues
•	Suggesting enhancements
•	Improving documentation

👨‍💻 Author
Umanga Buddhini Wackista-aratchie
LinkedIn Profile –(https://www.linkedin.com/in/umanga-buddhini-wackista-aratchie/)

Date: October 2025
Framework: Playwright with TypeScript
Design Pattern: Page Object Model (POM)
 
This framework demonstrates professional test automation practices with modern tools and comprehensive documentation strategies.

