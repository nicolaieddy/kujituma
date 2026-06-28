Problem: In the training event form for injury/illness, the user sees two body-location fields: the upper BodyPartsPicker ('Hip / Glute', etc.) and a lower generic 'Location (optional)' text input. This is confusing.

Goal: Keep the upper BodyPartsPicker as the primary location selector for injury/illness; hide the lower 'Location (optional)' free-text input only for that event type. Keep the location input for race and other event types.

Changes:
- In src/components/training/TrainingEventsPanel.tsx, wrap the existing 'Location (optional)' input block in a conditional so it renders only when form.event_type !== 'injury_illness'.
- Leave the BodyPartsPicker, severity, category, and all other fields unchanged.
- Leave the form state's location field and submit behavior intact; it will simply not be editable for injury/illness events.

Verification: Open the training events panel, add an injury/illness event, and confirm the lower 'Location (optional)' field is gone while the BodyPartsPicker remains. Add a race or other event and confirm the location input is still visible.