import { createEvent } from "#base";
import { ActivityType } from "discord.js";

const ROTATION_INTERVAL = 15000;

createEvent({
  name: "Bot Ready",
  event: "ready",
  once: true,
  async run(client) {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║          🔥 BLAZE SYSTEM - BOT ONLINE! 🔥               ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log(`📱 Bot: ${client.user?.tag}`);
    console.log(`🌐 Servidores: ${client.guilds.cache.size}`);

    const getStatusList = () => [
      {
        name: `Gerenciando ${client.guilds.cache.size} servidores simultâneos`,
      },
      { name: "Blaze System - Bots de qualidade para seu servidor" },
      { name: "Desenvolvido por: Since" },
    ];

    let currentIndex = 0;

    const updateStatus = () => {
      const statusList = getStatusList();
      const activity = statusList[currentIndex];

      client.user?.setPresence({
        activities: [
          {
            name: activity.name,
            type: ActivityType.Streaming,
            url: "https://twitch.tv/blazesystem",
          },
        ],
        status: "online",
      });

      currentIndex = (currentIndex + 1) % statusList.length;
    };

    updateStatus();
    setInterval(updateStatus, ROTATION_INTERVAL);
  },
});
