self.addEventListener("push", (event) => {
  let data = {
    title: "AI Career Coach",
    body: "Bạn có thông báo mới.",
    icon: "/icons/icon-192.jpg",
    data: { url: "/" },
    actions: []
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error("Lỗi đọc dữ liệu Push:", e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon, // Hiển thị trên thanh trạng thái đt
      data: data.data,
      actions: data.actions
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  if (event.action === "learn_now") {
    // Nếu bấm nút Học Ngay -> Mở web
    event.waitUntil(clients.openWindow(urlToOpen));
  } else if (event.action === "remind_later") {
    // Nếu bấm Nhắc Sau -> Tạm thời chỉ tắt thông báo
    console.log("Người dùng chọn Nhắc lại sau");
  } else {
    // Nếu bấm thẳng vào khung thông báo -> Mở web
    event.waitUntil(clients.openWindow(urlToOpen));
  }
});