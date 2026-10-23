import { SlashCommandBuilder } from "discord.js";
import type { Command } from "./types.js";

export default {
  data: new SlashCommandBuilder()
    .setName("echo")
    .setDescription("입력한 메시지를 그대로 보냅니다.")
    .addStringOption((option) =>
      option.setName("message").setDescription("보낼 메시지").setRequired(true),
    ),
  async execute(interaction) {
    const message = interaction.options.getString("message", true);
    await interaction.reply({ content: message, allowedMentions: { parse: [] } });
  },
} satisfies Command;
