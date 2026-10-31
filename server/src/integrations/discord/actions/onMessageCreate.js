const axios = require('axios');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    try {
      if (message?.channel?.id) {
        client._lastSeenChannelId = message.channel.id;
      }
      if (message?.author?.id) {
        client._lastSeenUserId = message.author.id;
      }
    } catch (e) {
      // ignore
    }
    const raidbotsRegex = /https:\/\/www\.raidbots\.com\/simbot\/report\/([a-zA-Z0-9]+)/g;
    const qeRegex = /https:\/\/questionablyepic\.com\/live\/upgradereport\/([a-zA-Z0-9]+)/g;

    const raidbotsMatches = Array.from(message.content.matchAll(raidbotsRegex), (m) => ({
      id: m[1],
      source: 'raidbots',
    }));
    const qeMatches = Array.from(message.content.matchAll(qeRegex), (m) => ({
      id: m[1],
      source: 'qe',
    }));
    const reports = [...raidbotsMatches, ...qeMatches];
    const reportIDs = reports.map((r) => r.id);

    console.log('Extracted report IDs:', reportIDs);
    if (reports.length > 0) {
      console.log(
        `Detected ${reports.length} report(s): ${reports.map((r) => `${r.id} (${r.source})`).join(', ')}`,
      );

      for (const report of reports) {
        const reportID = report.id;
        const reportSource = report.source;
        try {
          const initialMessage = await message.channel.send(
            `⏳ Début du traitement du rapport ${reportID}...`,
          );

          const serverPort = process.env.PORT || 5000;

          try {
            console.log(`Response from server for report ${reportID}:`);
            await initialMessage.edit(`⚠️ Le rapport ${reportID} est en cours de traitement`);
          } catch (apiError) {
            console.error("Erreur lors de l'appel API:", apiError);

            if (apiError.response?.data?.error) {
              await initialMessage.edit(`❌ Rapport rejeté: ${apiError.response.data.error}`);
            } else if (apiError.message?.toLowerCase().includes('niveau maximum')) {
              await initialMessage.edit(`❌ Rapport rejeté: ${apiError.message}`);
            } else {
              await initialMessage.edit(
                `❌ Erreur lors du traitement du rapport: ${apiError.message || 'Erreur inconnue'}`,
              );
            }
            return;
          }

          let isProcessing = true;
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

              // Jeton interne : la route exige un utilisateur ou le bot (SIMS-151).
              const statusResponse = await axios.get(
                `http://localhost:${serverPort}/1/update/report/status/${reportID}`,
                { headers: { 'x-internal-token': process.env.DISCORD_BOT_TOKEN } },
              );

              if (statusResponse.data?.status) {
                const status = statusResponse.data.status;

                if (statusResponse.data.discordMessage) {
                  await initialMessage.edit(` ${statusResponse.data.discordMessage}`);
                }

                if (status === 'completed') {
                  isProcessing = false;
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
    } else if (message.content === '!ping') {
      message.channel.send('Pong!');
    }
  });
};
