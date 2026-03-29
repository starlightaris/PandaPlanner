const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TASKS_API_URL = "https://www.googleapis.com/tasks/v1/lists/@default/tasks";

export const GoogleService = {
  // Save an Event to Google Calendar
  saveEvent: async (eventData: any, token: string) => {
    const response = await fetch(CALENDAR_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: eventData.title,
        location: eventData.location,
        description: "Organized by PandaPlanner 🐼",
        start: { dateTime: eventData.startTime, timeZone: 'Asia/Colombo' },
        end: { dateTime: eventData.endTime, timeZone: 'Asia/Colombo' },
      }),
    });
    return response.json();
  },

  // Save a Reminder to Google Tasks
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
        due: reminderData.reminderTime, // Must be RFC3339 timestamp
      }),
    });
    return response.json();
  },

  fetchUpcomingEvents: async (token: string) => {
    const response = await fetch(`${CALENDAR_API_URL}?timeMin=${new Date().toISOString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.items; // These are the events to import
  }
};