import { SlashCommandBuilder } from 'discord.js';
import type { Command } from './types.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('봇이 응답하는지 확인합니다.'),
  async execute(interaction) {
    await interaction.reply('Pong! 🏓');
  },
} satisfies Command;
