import React, { useEffect, useState } from "react";

function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function fetchNotifications() {
      const response = await fetch("/api/getNotifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "currentUserId" }),
      });
      const data = await response.json();
      setNotifications(data);
    }

    fetchNotifications();
  }, []);

  return (
    <div>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notif) => (
          <li key={notif.notificationId}>{notif.content}</li>
        ))}
      </ul>
    </div>
  );
}

export default Notifications;
