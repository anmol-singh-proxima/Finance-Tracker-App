# Expense Tracker UI Redesign Prompt

You are an expert UI/UX designer and senior frontend software engineer with extensive experience building modern, responsive web applications.

The current UI of this Expense Tracker application is functional but does not provide a good user experience. I want you to completely redesign the user interface while keeping usability, scalability, and maintainability as the highest priorities.

## Objective

Replace the existing "one form per day" layout with a modern calendar-based expense management interface similar to the month view found in popular calendar applications (such as Google Calendar or Apple Calendar).

The design should feel modern, clean, responsive, intuitive, and easy to navigate.

---

# Calendar Layout

Instead of displaying a form for entering expenses for a single day, create a monthly calendar view.

Requirements:

* The user should be able to select any month and year.
* After selecting a month, display a proper calendar for that month.
* The calendar must follow the actual calendar layout.
* Days should align correctly according to the weekday on which the month begins.
* Display seven columns representing:

  * Sunday
  * Monday
  * Tuesday
  * Wednesday
  * Thursday
  * Friday
  * Saturday
* Each week should occupy one row.
* Empty cells should appear before the first day and after the last day whenever required, just like a real calendar.

---

# Calendar Cell Design

Each day should have its own calendar cell.

Each cell should display:

* Date number
* Total number of expenses for that day
* Total amount spent for that day (optional but recommended)
* A short preview of the first few expenses (optional)
* Two action buttons:

  * View
  * Edit

The design should remain clean and uncluttered even when many expenses exist for a particular day.

---

# View Dialog

When the user clicks the **View** button, open a modal/dialog.

The dialog should display every expense recorded for that selected date.

Display the data in a structured table.

Suggested columns:

* S.No
* Item Name
* Category
* Price

The dialog should:

* Be scrollable if many records exist.
* Have a clean table layout.
* Include a Close button.
* Be responsive on different screen sizes.

---

# Edit Dialog

When the user clicks the **Edit** button, open another dialog.

This dialog should resemble the View dialog but allow full editing.

Each expense row should contain editable input fields for:

* Item Name
* Category
* Price

Users should be able to:

* Click directly into any field to edit it.
* Modify existing expenses.
* Add new expense rows.
* Delete existing expense rows.
* Save all changes.
* Cancel without saving changes.

---

# Delete Confirmation

When the user clicks the Delete button for an expense:

* Do not delete immediately.
* Display a confirmation dialog.

Example:

**Delete Expense?**

"Are you sure you want to delete this expense?"

Buttons:

* Cancel
* Confirm Delete

Delete the expense only after the user confirms.

---

# Add New Expense

Within the Edit dialog, provide an **Add Expense** button.

Clicking it should append a new editable row.

Each new row should include:

* Item Name
* Category
* Price

The new expense should only be saved after the user clicks **Save Changes**.

---

# User Experience Requirements

The interface should feel polished and modern.

Requirements include:

* Responsive layout for desktop, tablet, and mobile devices.
* Smooth animations for opening and closing dialogs.
* Hover effects on buttons.
* Clear spacing and alignment.
* Consistent typography.
* Proper color hierarchy.
* Rounded corners.
* Subtle shadows.
* Accessible color contrast.
* Keyboard-friendly navigation.
* Proper focus handling.

---

# Suggested UI Components

Use modern UI components such as:

* Calendar Grid
* Cards
* Modal/Dialog
* Tables
* Buttons
* Icons
* Dropdowns
* Date Picker
* Confirmation Dialog
* Floating Action Button (optional)

---

# Data Handling

The calendar should dynamically load expense data for the selected month.

Each calendar cell should automatically display:

* Expenses belonging to that specific date.
* Correct totals for that day.
* Updated information immediately after edits.

---

# State Management

Ensure the UI updates automatically after:

* Adding an expense
* Editing an expense
* Deleting an expense

There should be no need to manually refresh the page.

---

# Performance

The solution should be optimized for performance.

Avoid unnecessary re-renders and ensure smooth interaction even with a large number of expense records.

---

# Code Quality

Produce production-ready code that is:

* Clean
* Modular
* Well-structured
* Easy to maintain
* Reusable
* Well-commented

Follow frontend best practices and modern coding standards.

---

# Deliverables

Please provide:

1. Updated UI implementation.
2. Necessary component changes.
3. State management updates.
4. Any required backend/API modifications (if applicable).
5. Explanation of the architecture and design decisions.
6. Suggestions for future enhancements, such as drag-and-drop support, filters, search, recurring expenses, and analytics.

The final result should resemble a professional personal finance application rather than a simple expense entry form, with an emphasis on excellent usability, visual clarity, and scalability.
