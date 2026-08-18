import { createEvent } from "#base";
import { ChannelType } from "discord.js";
import {
  endVoiceSession,
  getVoiceSessionByChannel,
} from "../../services/ticket/voice.db.js";

createEvent({
  name: "ticket-voice-cleanup",
  event: "voiceStateUpdate",
  async run(_oldState, newState) {
    const channel = newState.channel;
    if (!channel || channel.type !== ChannelType.GuildVoice) return;
    if (!channel.name.startsWith("call-")) return;

    const session = getVoiceSessionByChannel(channel.id);
    if (!session) return;

    const members = channel.members.filter((m) => !m.user.bot);
    if (members.size > 0) return;

    const ended = endVoiceSession(session.ticket_id);
    if (!ended) return;

    try {
      if (channel.deletable) await channel.delete();
    } catch (err) {
      console.error("[ticket-voice-cleanup]", err);
    }
  },
});
