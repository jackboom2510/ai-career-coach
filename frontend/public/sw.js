self.addEventListener("push", (event) => {
  let data = { title: "AI Career Coach", body: "Bạn có thông báo mới." };
  if (event.data) {
    data = event.data.json();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.jng",
      badge: "/icons/icon-192.jng",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});