import axios from 'axios';
import { ChannelType, Collection, Events } from 'discord.js';

import config from '../Base/config.js';
const cooldown = new Collection();

export default {
  name: Events.MessageCreate,
  async execute(message) {
    const { client } = message;

    if (message.author.bot) return;
    if (message.channel.type === ChannelType.DM) return;

    try {
      if (message && message.channel && message.channel.id)
        client._lastSeenChannelId = message.channel.id;
      if (message && message.author && message.author.id)
        client._lastSeenUserId = message.author.id;
    } catch (e) {
      // ignore
    }

    const raidbotsRegex = /https:\/\/www\.raidbots\.com\/simbot\/report\/([a-zA-Z0-9]+)/g;
    const qeRegex = /https:\/\/questionablyepic\.com\/live\/upgradereport\/([a-zA-Z0-9]+)/g;

    const reports = [
      ...Array.from(message.content.matchAll(raidbotsRegex), (m) => ({
        id: m[1],
        source: 'raidbots',
      })),
      ...Array.from(message.content.matchAll(qeRegex), (m) => ({
        id: m[1],
        source: 'qe',
      })),
    ];

    if (reports.length > 0) {
      for (const report of reports) {
        const reportID = report.id;
        const reportSource = report.source;
        try {
          const initialMessage = await message.channel.send(
            `⏳ Début du traitement du rapport ${reportID}...`,
          );

          const serverApiUrl = config.serverApiUrl;

          try {
            console.log(`Calling API to process report ${reportID} (source: ${reportSource})...`);
            // Jeton interne : les routes de rapports exigent un utilisateur ou le bot (SIMS-151).
            await axios.get(`${serverApiUrl}/1/update/report/${reportID}`, {
              params: { source: reportSource },
              headers: { 'x-internal-token': config.token },
            });
            await initialMessage.edit(`⚠️ Le rapport ${reportID} est en cours de traitement`);
          } catch (apiError) {
            console.error("Erreur lors de l'appel API:", apiError);
            if (apiError.response && apiError.response.data && apiError.response.data.error) {
              await initialMessage.edit(`❌ Rapport rejeté: ${apiError.response.data.error}`);
            } else if (
              apiError.message &&
              apiError.message.toLowerCase().includes('niveau maximum')
            ) {
              await initialMessage.edit(`❌ Rapport rejeté: ${apiError.message}`);
            } else {
              await initialMessage.edit(
                `❌ Erreur lors du traitement du rapport: ${apiError.message || 'Erreur inconnue'}`,
              );
            }
            return;
          }

          let checkCount = 0;
          const maxChecks = 10;
          const checkStatus = async () => {
            try {
              checkCount++;
              if (checkCount >= maxChecks) {
                await initialMessage.edit(
                  `⚠️ Délai de vérification dépassé pour le rapport ${reportID}. Le traitement continue en arrière-plan.`,
                );
                return;
              }

              const statusResponse = await axios.get(
                `${serverApiUrl}/1/update/report/status/${reportID}`,
                { headers: { 'x-internal-token': config.token } },
              );
              if (statusResponse.data && statusResponse.data.status) {
                const status = statusResponse.data.status;
                if (statusResponse.data.discordMessage) {
                  await initialMessage.edit(` ${statusResponse.data.discordMessage}`);
                }

                if (status === 'completed') {
                  if (statusResponse.data.discordMessage) {
                    await initialMessage.edit(`${statusResponse.data.discordMessage}`);
                  } else {
                    await initialMessage.edit(
                      `✅ Traitement du rapport ${reportID} terminé - ${statusResponse.data.message || ''}`,
                    );
                    setTimeout(async () => {
                      try {
                        await initialMessage.delete();
                        await message.react('✅');
                      } catch (deleteError) {
                        console.error(
                          "Erreur lors de la suppression du message ou de l'ajout de la réaction:",
                          deleteError,
                        );
                      }
                    }, 2500);
                  }
                } else if (status === 'processing') {
                  const progress = statusResponse.data.progress || `${checkCount}/${maxChecks}`;
                  const statusMsg = statusResponse.data.message || 'En cours...';
                  if (statusResponse.data.discordMessage) {
                    await initialMessage.edit(
                      `⏳ Traitement du rapport ${reportID} en cours: ${statusMsg} (${progress}) - ${statusResponse.data.discordMessage}`,
                    );
                  } else {
                    await initialMessage.edit(
                      `⏳ Traitement du rapport ${reportID} en cours: ${statusMsg} (${progress})`,
                    );
                  }
                  setTimeout(checkStatus, 5000);
                } else if (status === 'error') {
                  await initialMessage.edit(
                    `❌ Erreur lors du traitement du rapport ${reportID}: ${statusResponse.data.message || 'Erreur inconnue'}`,
                  );
                } else {
                  await initialMessage.edit(
                    `⚠️ État inconnu pour le rapport ${reportID}: ${status}`,
                  );
                }
              } else {
                await initialMessage.edit(
                  `⏳ Traitement du rapport ${reportID} en cours... (${checkCount}/${maxChecks})`,
                );
                setTimeout(checkStatus, 5000);
              }
            } catch (statusError) {
              console.error(`Erreur lors de la vérification du statut: ${statusError}`);
              if (checkCount < maxChecks) {
                await initialMessage.edit(
                  `⚠️ Erreur lors de la vérification du statut du rapport ${reportID}, nouvelle tentative dans 5 secondes...`,
                );
                setTimeout(checkStatus, 5000);
              } else {
                await initialMessage.edit(
                  `❌ Erreur lors de la vérification du statut du rapport ${reportID} après plusieurs tentatives.`,
                );
              }
            }
          };

          setTimeout(checkStatus, 5000);
        } catch (error) {
          console.error(`Failed to process report ${reportID}:`, error);
          message.channel.send(`Failed to process report ${reportID}. Please try again later.`);
        }
      }
    }

    const { prefix } = config;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    if (cmd.length === 0) return;

    let command = client.commands.get(cmd);
    command ||= client.commands.get(client.commandAliases.get(cmd));

    if (command) {
      if (command.ownerOnly && !config.owners.includes(message.author.id)) {
        return message.reply({
          content: 'Only my **developers** can use this command.',
        });
      }

      if (command.cooldown) {
        if (cooldown.has(`${command.name}-${message.author.id}`)) {
          const nowDate = message.createdTimestamp;
          const waitedDate = cooldown.get(`${command.name}-${message.author.id}`) - nowDate;
          return message
            .reply({
              content: `Cooldown is currently active, please try again <t:${Math.floor(new Date(nowDate + waitedDate).getTime() / 1000)}:R>.`,
            })
            .then((msg) =>
              setTimeout(
                () => msg.delete(),
                cooldown.get(`${command.name}-${message.author.id}`) - Date.now() + 1000,
              ),
            );
        }

        command.prefixRun(message, args);
        cooldown.set(`${command.name}-${message.author.id}`, Date.now() + command.cooldown);
        setTimeout(() => {
          cooldown.delete(`${command.name}-${message.author.id}`);
        }, command.cooldown);
      } else {
        command.prefixRun(message, args);
      }
    }
  },
};
