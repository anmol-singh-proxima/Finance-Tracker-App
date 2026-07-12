# Feature Enhancement & UI/UX Improvement Prompt

You are an expert full-stack software engineer, database architect, and UI/UX designer. Enhance the existing Expense Tracker application by implementing the following features and architectural improvements. The solution should be production-ready, scalable, maintainable, and follow modern software engineering best practices.

---

# 1. Calendar Enhancements

## Disable Future Dates

The monthly calendar should not allow users to interact with future dates.

Requirements:

* All future dates must appear visually disabled (grayed out).
* Disabled dates should not respond to clicks or hover actions.
* Users should not be able to:

  * Add expenses
  * Edit expenses
  * Delete expenses
  * View empty dialogs for future dates
* Only the current date and past dates should be interactive.

The disabled state should be visually consistent with the application's design system.

---

# 2. Global Currency Support

Introduce global currency management.

Requirements:

* Add a currency selector in the application header (or another prominent global location).
* Users should be able to choose their preferred currency.
* The selected currency should automatically be applied throughout the application, including:

  * Expenses
  * Investments
  * Reports
  * Dashboard
  * Statistics
  * Calendar
  * Dialogs
  * Tables
  * Charts
* Store the selected currency so it persists across sessions (e.g., in local storage or user preferences).
* The application should be designed so that adding more currencies in the future requires minimal changes.

---

# 3. Category Management Module

The application currently lacks proper category management. Create a dedicated **Categories** module.

Requirements:

* Add a new navigation item labeled **Categories**.
* Design this page with the same layout and styling as the existing Expenses and Investments pages.
* Display all categories in a structured table.

Each category should include:

* Category Name
* Category Type
* Parent Category (if applicable)
* Number of linked records (optional but recommended)
* Created Date (optional)
* Actions

Supported actions:

* View
* Edit
* Delete
* Create New Category

---

# 4. Category Types

Each category must belong to one of the following types:

* Expense
* Investment

The database schema should be updated accordingly.

The application should only display categories relevant to the selected module.

For example:

* Expense pages should only show Expense categories.
* Investment pages should only show Investment categories.

---

# 5. Category CRUD Operations

Support complete category management.

Users should be able to:

* Create new categories.
* View category details.
* Edit existing categories.
* Delete categories.

All forms should include proper validation.

---

# 6. Safe Category Deletion

Before deleting a category, perform a dependency check.

If the category is currently referenced by any Expense or Investment record:

* Prevent deletion.
* Display a clear message explaining why deletion is not allowed.
* Optionally display the number of linked records.

Example:

"This category cannot be deleted because it is currently used by existing expense or investment records."

If no linked records exist:

* Display a confirmation dialog.
* Delete the category only after user confirmation.

Never allow accidental deletion.

---

# 7. Subcategory Support

Introduce hierarchical categories.

Each category may optionally have a parent category.

Examples:

Utilities

* Electricity Bill
* Water Bill
* Internet Bill
* Wi-Fi Bill

Subscriptions

* Netflix
* Amazon Prime
* Spotify
* ET Money

Food

* Breakfast
* Lunch
* Dinner
* Snacks

Travel

* Flight
* Train
* Taxi
* Hotel

Requirements:

* Parent categories are optional.
* Unlimited depth is not required; a single parent-child hierarchy is sufficient.
* Users should be able to create, edit, and delete subcategories.

---

# 8. Expense & Investment Forms

Update all relevant forms.

When selecting a category:

* Display parent categories.
* Allow selecting either:

  * The parent category, or
  * Any subcategory.

Both options should be treated as valid selections.

The UI should clearly distinguish parent categories from their child categories (e.g., indentation or grouped dropdowns).

---

# 9. Database Updates

Update the database schema to support:

* Category Type
* Parent Category
* Foreign key relationships
* Referential integrity
* Validation rules

Ensure the schema remains normalized and scalable.

---

# 10. Consistent Page Layout

Ensure every page follows the same layout structure.

Requirements:

* Use the Expenses page as the visual reference.
* Apply consistent:

  * Margins
  * Padding
  * Width
  * Alignment
  * Content spacing
  * Card spacing
  * Table spacing

Every page should feel visually consistent.

---

# 11. Centralized Theme System

The application currently lacks a centralized theming infrastructure.

Create a reusable theme system.

Requirements:

* Define a centralized color palette.
* Avoid hardcoding colors throughout the application.
* Use theme variables/tokens instead of individual CSS values.

The theme should define colors for:

* Primary
* Secondary
* Accent
* Background
* Surface
* Text
* Success
* Warning
* Error
* Border
* Hover
* Disabled
* Header
* Footer

Future color changes should only require updating the theme configuration.

Support future expansion for Light Mode and Dark Mode.

---

# 12. Header Improvements

Improve the application header.

Requirements:

* Add a user/profile icon before the displayed user name.
* Ensure the icon aligns correctly with the existing header layout.
* Maintain consistent spacing and responsiveness.

---

# 13. Footer

Create a professional footer.

Requirements:

* Add meaningful placeholder content such as:

  * Application name
  * Copyright
  * Version
  * "Built with ❤️"
  * Privacy Policy
  * Terms
  * Contact (placeholder)

The content can be updated later.

Layout requirements:

* Footer should always remain at the bottom of the viewport.
* Even when page content is short, the footer should remain fixed to the bottom of the page layout (sticky footer), without overlapping content.
* Ensure responsiveness across all supported screen sizes.

---

# 14. UI/UX Consistency

Maintain consistency across the application.

Ensure:

* Uniform spacing
* Consistent typography
* Consistent icons
* Consistent dialogs
* Consistent buttons
* Reusable components
* Smooth animations
* Accessible color contrast
* Responsive layouts
* Modern design patterns

---

# 15. Performance

Implement these enhancements without negatively affecting application performance.

The application should remain:

* Fast
* Responsive
* Efficient
* Scalable

Avoid unnecessary re-renders and redundant database queries.

---

# 16. Code Quality

All changes should follow production-quality standards.

Requirements:

* Modular architecture
* Clean code
* Reusable components
* Proper separation of concerns
* Well-documented code
* Consistent naming conventions
* Strong validation
* Error handling
* Maintainable database design

---

# Deliverables

Please provide:

1. Updated frontend implementation.
2. Updated backend/API implementation (if applicable).
3. Updated database schema and migrations.
4. Theme infrastructure implementation.
5. Category management module.
6. Calendar enhancements.
7. Currency management implementation.
8. Footer and header improvements.
9. Explanation of all architectural changes.
10. Any additional recommendations that would improve scalability, maintainability, security, or user experience.

The final result should resemble a polished, production-ready personal finance application with a modern architecture, intuitive user experience, consistent design language, and room for future expansion.
