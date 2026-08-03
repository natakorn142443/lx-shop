
        // Init chat only after socket.io is loaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initAdminChat, 500);
        });
    