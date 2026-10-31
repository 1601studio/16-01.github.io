(() => {
  const render = () => {
    const allMessages = AdminStore.getMessages();
    const query = document.getElementById("message-search").value.trim().toLowerCase();
    const filter = document.getElementById("message-filter").value;
    const items = allMessages.filter((message) => {
      const matchesText = !query || [message.sender, message.email, message.subject, message.body].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = !filter || (filter === "read" ? message.read : !message.read);
      return matchesText && matchesStatus;
    });
    document.getElementById("messages-total").textContent = `(${items.length}${items.length !== allMessages.length ? ` of ${allMessages.length}` : ""})`;
    const target = document.getElementById("message-list");
    if (!items.length) {
      target.innerHTML = `<div class="panel"><div class="empty-state"><strong>${allMessages.length ? "No matching messages" : "No messages in this browser"}</strong><span>${allMessages.length ? "Try a different search or status filter." : "Contact form submissions are not connected to this inbox."}</span></div></div>`;
      return;
    }
    target.innerHTML = items.map((message) => `<article class="message-card ${message.read ? "" : "is-unread"}"><div><div class="message-card__top"><span class="message-card__sender">${AdminUI.escapeHTML(message.sender)}</span><span class="status-pill ${message.read ? "" : "status-pill--unread"}">${message.read ? "Read" : "Unread"}</span></div><h3 class="message-card__subject">${AdminUI.escapeHTML(message.subject)}</h3><p class="message-card__snippet">${AdminUI.escapeHTML(message.body)}</p><p class="message-card__meta">${AdminUI.escapeHTML(message.email)} · ${AdminUI.escapeHTML(message.date)}</p></div><div class="message-card__actions"><button class="small-button" type="button" data-message-toggle="${AdminUI.escapeHTML(message.id)}">${message.read ? "Mark unread" : "Mark read"}</button><button class="small-button small-button--danger" type="button" data-message-delete="${AdminUI.escapeHTML(message.id)}">Delete</button></div></article>`).join("");
  };

  window.AdminMessages = {
    init() {
      document.getElementById("message-search").addEventListener("input", render);
      document.getElementById("message-filter").addEventListener("change", render);
      document.getElementById("message-list").addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-message-toggle]");
        const remove = event.target.closest("[data-message-delete]");
        const id = toggle?.dataset.messageToggle || remove?.dataset.messageDelete;
        if (!id) return;
        const messages = AdminStore.getMessages();
        const message = messages.find((item) => item.id === id);
        if (!message) {
          AdminUI.showToast("This message no longer exists.", true);
          render();
          return;
        }
        try {
          if (toggle) {
            AdminStore.saveMessages(messages.map((item) => item.id === id ? { ...item, read: !item.read } : item));
            AdminStore.recordActivity(message.read ? "message-marked-unread" : "message-marked-read", message.subject);
          } else {
            if (!window.confirm(`Delete “${message.subject}” from this browser’s message list?`)) return;
            AdminStore.saveMessages(messages.filter((item) => item.id !== id));
            AdminStore.recordActivity("message-deleted", message.subject);
          }
          render();
          AdminUI.renderOverview();
          AdminUI.showToast(toggle ? `Message marked ${message.read ? "unread" : "read"}.` : "Message removed from this browser.");
        } catch (error) {
          AdminUI.showToast(error.message, true);
        }
      });
    },
    render,
  };
})();
