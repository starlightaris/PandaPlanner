// services/MLService.ts
import FirebaseService from "./FirebaseService";

export interface Suggestion {
  id: string;
  type: 'DEEP_WORK' | 'REST' | 'ACADEMIC' | 'RECURRING';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  confidenceScore: number;
}

class MLService {

  async getPredictiveSuggestions(todaysEvents: any[]): Promise<Suggestion[]> {
    try {
      const allEvents = await FirebaseService.getUserEvents();
      const suggestions: Suggestion[] = [];

      // 1. Detect recurring patterns from history
      const recurringSuggestions = this.detectRecurringPatterns(allEvents, todaysEvents);
      suggestions.push(...recurringSuggestions);

      // 2. Suggest for free days (today has no events)
      const today = new Date().toISOString().split('T')[0];
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todaysFirestoreEvents = todaysEvents.filter(e => e.date === today);

      if (todaysFirestoreEvents.length === 0) {
        const freeDay = this.suggestForFreeDay(allEvents, todayStr);
        if (freeDay) suggestions.push(freeDay);
      }

      // 3. Gap-based suggestions (existing logic, improved)
      const gapSuggestions = this.getGapSuggestions(todaysFirestoreEvents);
      suggestions.push(...gapSuggestions);

      // Deduplicate and cap at 5
      return suggestions.slice(0, 5);
    } catch (error) {
      console.error("MLService error:", error);
      return [];
    }
  }

  /**
   * Detects events that appear on the same weekday repeatedly
   * and suggests them if they're missing from today's schedule
   */
  private detectRecurringPatterns(allEvents: any[], todaysEvents: any[]): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const today = new Date();
    const todayDow = today.getDay(); // 0 = Sunday
    const todayStr = today.toISOString().split('T')[0];

    // Group past events by weekday + title similarity
    const patternMap: { [key: string]: any[] } = {};

    allEvents.forEach(event => {
      const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const dow = eventDate.getDay();
      const hour = eventDate.getHours();
      const normalizedTitle = event.title.toLowerCase().trim();

      const key = `${dow}-${normalizedTitle}`;
      if (!patternMap[key]) patternMap[key] = [];
      patternMap[key].push({ ...event, dow, hour });
    });

    // Find patterns that match today's weekday
    Object.entries(patternMap).forEach(([key, occurrences]) => {
      const [dow] = key.split('-');

      // Must have occurred at least 2 times on this weekday to be a pattern
      if (parseInt(dow) === todayDow && occurrences.length >= 2) {
        const title = occurrences[0].title;

        // Check if it's already in today's schedule
        const alreadyScheduled = todaysEvents.some(
          e => e.title.toLowerCase().trim() === title.toLowerCase().trim()
            && e.date === todayStr
        );

        if (!alreadyScheduled) {
          // Calculate average start time from past occurrences
          const avgHour = Math.round(
            occurrences.reduce((sum, e) => {
              const d = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
              return sum + d.getHours();
            }, 0) / occurrences.length
          );
          const avgMin = Math.round(
            occurrences.reduce((sum, e) => {
              const d = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
              return sum + d.getMinutes();
            }, 0) / occurrences.length
          );

          const startStr = `${String(avgHour).padStart(2, '0')}:${String(avgMin).padStart(2, '0')}`;
          const endHour = avgHour + 1;
          const endStr = `${String(endHour).padStart(2, '0')}:${String(avgMin).padStart(2, '0')}`;

          const confidence = Math.min(0.6 + occurrences.length * 0.1, 0.99);

          suggestions.push({
            id: `recurring-${key}-${Date.now()}`,
            type: 'RECURRING',
            title: `${title}?`,
            description: `You usually have "${title}" on ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}s. Want to add it?`,
            startTime: startStr,
            endTime: endStr,
            confidenceScore: confidence,
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * If today is free, suggest something based on what the user
   * typically does on this weekday
   */
  private suggestForFreeDay(allEvents: any[], todayStr: string): Suggestion | null {
    const todayDow = new Date().getDay();

    const sameDayEvents = allEvents.filter(event => {
      const d = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      return d.getDay() === todayDow;
    });

    if (sameDayEvents.length === 0) return null;

    // Find most common category on this weekday
    const categoryCounts: { [key: string]: number } = {};
    sameDayEvents.forEach(e => {
      const cat = e.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      id: `freeday-${Date.now()}`,
      type: 'ACADEMIC',
      title: `Free ${todayStr}`,
      description: `Your ${todayStr}s usually have ${topCategory} activities. Nothing scheduled today — want to plan something?`,
      startTime: '09:00',
      endTime: '10:00',
      confidenceScore: 0.75,
    };
  }

  /**
   * Original gap detection, kept but improved to also suggest REST
   */
  private getGapSuggestions(todaysEvents: any[]): Suggestion[] {
    if (todaysEvents.length < 2) return [];

    const suggestions: Suggestion[] = [];
    const sorted = [...todaysEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (let i = 0; i < sorted.length - 1; i++) {
      const gapMinutes = this.calculateGap(sorted[i].endTime, sorted[i + 1].startTime);
      const startHour = parseInt(sorted[i].endTime.split(':')[0]);

      if (gapMinutes >= 90 && startHour < 16) {
        suggestions.push({
          id: `gap-deepwork-${i}-${Date.now()}`,
          type: 'DEEP_WORK',
          title: 'Deep Work Window',
          description: `${gapMinutes}m free before your next event — great for focused work.`,
          startTime: sorted[i].endTime,
          endTime: sorted[i + 1].startTime,
          confidenceScore: 0.88,
        });
      } else if (gapMinutes >= 45) {
        suggestions.push({
          id: `gap-academic-${i}-${Date.now()}`,
          type: 'ACADEMIC',
          title: 'Quick Review Window',
          description: `${gapMinutes}m gap — good for notes, emails, or light tasks.`,
          startTime: sorted[i].endTime,
          endTime: sorted[i + 1].startTime,
          confidenceScore: 0.75,
        });
      } else if (gapMinutes >= 15 && gapMinutes < 45) {
        suggestions.push({
          id: `gap-rest-${i}-${Date.now()}`,
          type: 'REST',
          title: 'Rest Break',
          description: `Short ${gapMinutes}m gap — step away and recharge before your next event.`,
          startTime: sorted[i].endTime,
          endTime: sorted[i + 1].startTime,
          confidenceScore: 0.70,
        });
      }
    }

    return suggestions;
  }

  private calculateGap(start: string, end: string): number {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }
}

export default new MLService();