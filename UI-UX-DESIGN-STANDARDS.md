# UI/UX Design Standards

The application must follow modern UI/UX best practices and deliver a premium user experience across all devices. Every screen, component, and interaction should feel polished, responsive, intuitive, and visually appealing.

## Responsive Design

* Build the application using a **mobile-first responsive design** approach.
* Ensure the UI adapts seamlessly to all common screen sizes, including:

  * Mobile (small screens)
  * Tablet (medium screens)
  * Laptop (large screens)
  * Desktop (extra-large screens)
* Prevent horizontal scrolling unless explicitly required.
* Ensure layouts reflow gracefully without overlapping or clipped content.
* Optimize typography, spacing, and component sizing for each screen size.
* Ensure touch targets are comfortably tappable on mobile (minimum ~44×44px).
* Test responsiveness across portrait and landscape orientations where applicable.

## Modern Visual Design

* Use a clean, sleek, modern, and professional interface inspired by contemporary SaaS applications.
* Follow a consistent design language throughout the application.
* Use a visually balanced color palette with primary, secondary, accent, success, warning, and error colors.
* Maintain high contrast for readability while keeping the overall appearance elegant.
* Use soft shadows, subtle gradients, rounded corners, and modern card-based layouts where appropriate.
* Avoid cluttered interfaces and excessive visual noise.
* Maintain consistency in fonts, icons, buttons, cards, dialogs, tables, and navigation components.

## User Experience

* Every interaction should feel smooth and responsive.
* Minimize perceived latency by providing immediate visual feedback for user actions.
* Avoid blocking the UI during data loading whenever possible.
* Use loading indicators, progress bars, skeleton loaders, or placeholders for asynchronous operations.
* Display meaningful empty states when no data is available.
* Provide informative error messages and success notifications.
* Use confirmation dialogs only for destructive or irreversible actions.

## Layout & Spacing

* Follow a consistent spacing system throughout the application.
* Apply appropriate margins and paddings based on screen size.
* Ensure sufficient whitespace to improve readability and reduce visual clutter.
* Align components consistently using a responsive grid system.
* Keep forms, tables, dialogs, and cards visually balanced and well-spaced.

## Typography

* Use modern, highly readable fonts.
* Maintain a clear typography hierarchy using appropriate font sizes, weights, and line spacing.
* Ensure text remains readable across all device sizes.
* Avoid excessive text density and long unbroken paragraphs.

## Color System

* Define a consistent color palette for the entire application.
* Define colors (and other visual values like spacing and radii) as design tokens / CSS variables rather than hardcoding values throughout components.
* Support both Light Mode and Dark Mode with smooth switching between themes.
* Default the theme to the user's system preference (`prefers-color-scheme`) and persist their explicit choice.
* Ensure colors meet accessibility guidelines for contrast and readability.
* Use color intentionally to communicate status, actions, and hierarchy — never as the only means of conveying information.
* Style disabled elements with the theme's dedicated disabled colors: visually muted, non-interactive (no hover/click affordances), and exposed to assistive technology via the `disabled` attribute or `aria-disabled`.

## Animations & Micro-Interactions

* Use smooth, subtle animations to enhance the user experience without affecting performance.
* Add hover, focus, active, and pressed states for interactive components.
* Use animated transitions for dialogs, sidebars, dropdowns, and page navigation.
* Keep animations fast, consistent, and unobtrusive (typically 150–300ms for UI transitions).
* Respect the user's `prefers-reduced-motion` setting by reducing or disabling non-essential animations.

## Navigation

* Design intuitive and easy-to-use navigation.
* Ensure users can reach important features with minimal clicks.
* Highlight the active page or selected navigation item.
* Use breadcrumbs where beneficial for deeper navigation structures.
* Support keyboard navigation throughout the application.

## Forms

* Design forms that are simple, clean, and easy to complete.
* Clearly indicate required and optional fields.
* Provide inline validation with helpful error messages.
* Preserve user input when validation fails.
* Group related fields logically.
* Use appropriate input types, `autocomplete` attributes, and mobile keyboards (e.g. numeric for amounts, email for email fields).
* Disable or debounce submit actions to prevent duplicate submissions.
* Optimize forms for both desktop and mobile interactions.

## Tables & Data Display

* Make tables responsive and easy to read.
* Support sorting, filtering, searching, and pagination where appropriate.
* Keep column alignment consistent.
* Use alternating row styles or subtle dividers to improve readability.
* Display informative messages when no records are available.

## Performance

* Optimize rendering to minimize unnecessary re-renders.
* Use lazy loading, code splitting, and efficient asset loading where applicable.
* Optimize images and icons.
* Ensure the application feels fast even when handling large datasets.
* Maintain smooth scrolling and fluid interactions.
* Avoid layout shift while content loads — reserve space for images, skeletons, and async content.

## Accessibility

* Target WCAG 2.1 Level AA compliance as the baseline.
* Ensure keyboard accessibility for all interactive elements.
* Provide clearly visible focus indicators (e.g. via `:focus-visible`).
* Manage focus correctly in dialogs and overlays: trap focus while open, restore it on close, and support closing with Escape.
* Use semantic HTML elements.
* Include descriptive labels and ARIA attributes where appropriate.
* Ensure sufficient color contrast for readability.

## Consistency

* Maintain consistent button styles, iconography, spacing, and interaction patterns across the application.
* Use reusable UI components instead of duplicating designs.
* Keep dialogs, cards, forms, and tables visually consistent.
* Apply consistent naming conventions and styling across the project.

## Feedback & Notifications

* Provide immediate feedback after user actions.
* Use toast notifications, alerts, or snackbars for success, warning, and error messages.
* Display progress indicators during long-running operations.
* Ensure notifications are informative, concise, and non-intrusive.

## Design Principles

The application should prioritize:

* Simplicity
* Consistency
* Readability
* Performance
* Scalability
* Accessibility
* Responsiveness
* Maintainability
* Professional aesthetics
* User satisfaction

Every UI element should have a clear purpose, and every interaction should feel natural, responsive, and polished.

## Code Expectations

Any generated frontend code should:

* Follow modern UI/UX best practices.
* Be modular and reusable.
* Maintain a clear separation of concerns.
* Use responsive layouts and scalable design patterns.
* Be production-ready, maintainable, and well-documented.
* Avoid unnecessary complexity while delivering a premium user experience.

The final application should look and feel comparable to high-quality modern SaaS products, delivering a fast, elegant, accessible, and visually cohesive experience across all supported devices.
