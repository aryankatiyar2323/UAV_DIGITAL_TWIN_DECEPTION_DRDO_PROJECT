function formatEventTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function EventLog({ events }) {
  return (
    <section className="event-log">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h2>Scenario events</h2>
        </div>
      </div>
      <div className="event-list">
        {events.map((event) => (
          <article className={`event-item ${event.severity}`} key={event._id || event.id}>
            <time>{formatEventTime(event.createdAt)}</time>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

