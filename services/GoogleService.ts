const CALENDAR_API_URL = "[https://www.googleapis.com/calendar/v3/calendars/primary/events](https://www.googleapis.com/calendar/v3/calendars/primary/events)";
const TASKS_API_URL = "[https://www.googleapis.com/tasks/v1/lists/@default/tasks](https://www.googleapis.com/tasks/v1/lists/@default/tasks)";

export const GoogleService = {
  saveEvent: async (eventData: any, token: string) => {
    // --- FIX: Ensure we use ISO strings for Google API ---
    const startISO = eventData.startTime instanceof Date ? eventData.startTime.toISOString() : eventData.startTime;
    const endISO = eventData.endTime instanceof Date ? eventData.endTime.toISOString() : eventData.endTime;

    const response = await fetch(CALENDAR_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: eventData.title,
        location: eventData.location || "No Location Provided",
        description: "Organized by PandaPlanner 🐼",
        start: { dateTime: startISO }, // Let Google detect timezone from ISO string
        end: { dateTime: endISO },
      }),
    });
    return response.json();
  },

  saveReminder: async (reminderData: any, token: string) => {
    const response = await fetch(TASKS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: reminderData.title,
        notes: reminderData.location || "Panda Reminder",
        due: reminderData.reminderTime, 
      }),
    });
    return response.json();
  }
};