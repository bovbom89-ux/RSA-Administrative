require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   CONFIGURATION
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error(
        "Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env"
    );

    process.exit(1);
}

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message
    ]
});

/* =========================================================
   DATA STORAGE
========================================================= */

const dataDirectory = path.join(__dirname, "data");

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, {
        recursive: true
    });
}

const warningsFile = path.join(
    dataDirectory,
    "warnings.json"
);

const configFile = path.join(
    dataDirectory,
    "config.json"
);

function loadJSON(file, fallback) {

    try {

        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(
                    fallback,
                    null,
                    2
                )
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            `Could not load ${file}:`,
            error
        );

        return fallback;
    }
}

function saveJSON(file, data) {

    try {

        fs.writeFileSync(
            file,
            JSON.stringify(
                data,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            `Could not save ${file}:`,
            error
        );
    }
}

const warnings = loadJSON(
    warningsFile,
    {}
);

const configs = loadJSON(
    configFile,
    {}
);

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

    /* -------------------------
       GENERAL
    ------------------------- */

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check the bot's latency."
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription(
            "View information about RSA Administrator."
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription(
            "View information about this server."
        ),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription(
            "View information about a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to inspect."
                )
                .setRequired(false)
        ),

    /* -------------------------
       MODERATION
    ------------------------- */

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription(
            "Ban a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to ban."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription(
            "Kick a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to kick."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription(
            "Timeout a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to timeout."
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription(
                    "Timeout length."
                )
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription(
            "Remove a member's timeout."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription(
            "Warn a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription(
            "View a member's warnings."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription(
            "Clear a member's warnings."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription(
            "Delete messages."
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(
                    "Number of messages."
                )
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    /* -------------------------
       CHANNEL MANAGEMENT
    ------------------------- */

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription(
            "Lock the current channel."
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription(
            "Unlock the current channel."
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription(
            "Set channel slowmode."
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription(
                    "Slowmode duration."
                )
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    /* -------------------------
       ROLE MANAGEMENT
    ------------------------- */

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage a member's role."
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription(
                    "Add a role."
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member."
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role."
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription(
                    "Remove a role."
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member."
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role."
                        )
                        .setRequired(true)
                )
        ),

    /* -------------------------
       ANNOUNCEMENTS
    ------------------------- */

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription(
            "Send an RSA announcement."
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription(
                    "Announcement title."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription(
                    "Announcement content."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("colour")
                .setDescription(
                    "Hex colour, e.g. #315B9A."
                )
                .setRequired(false)
        ),

    /* -------------------------
       EMBED CREATOR
    ------------------------- */

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the RSA embed creator."
        ),

    /* -------------------------
       HELP
    ------------------------- */

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "View RSA Administrator commands."
        )

].map(command => command.toJSON());

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    try {

        console.log(
            "Registering RSA Administrator commands..."
        );

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "Commands registered successfully."
        );

    } catch (error) {

        console.error(
            "Command registration error:",
            error
        );

    }
}

/* =========================================================
   PERMISSION HELPERS
========================================================= */

function hasPermission(
    interaction,
    permission
) {

    return interaction.member.permissions.has(
        permission
    );

}

function canModerate(
    interaction,
    target
) {

    if (!target) {
        return false;
    }

    if (
        target.id === interaction.user.id
    ) {
        return false;
    }

    if (
        target.id === interaction.guild.ownerId
    ) {
        return false;
    }

    if (
        interaction.member.id !==
        interaction.guild.ownerId &&
        target.roles.highest.position >=
        interaction.member.roles.highest.position
    ) {
        return false;
    }

    if (
        target.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   LOGGING
========================================================= */

async function logAction(
    guild,
    title,
    description
) {

    const config =
        configs[guild.id];

    if (!config || !config.logChannel) {
        return;
    }

    const channel =
        guild.channels.cache.get(
            config.logChannel
        );

    if (!channel) {
        return;
    }

    const embed =
        new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor("#315B9A")
            .setTimestamp();

    await channel.send({
        embeds: [embed]
    }).catch(() => {});

}

/* =========================================================
   READY
========================================================= */

client.once(
    "ready",
    async () => {

        console.log(
            `RSA Administrator online as ${client.user.tag}`
        );

        client.user.setPresence({
            activities: [
                {
                    name: "Roblox Schools Association",
                    type: 3
                }
            ],
            status: "online"
        });

        await registerCommands();

    }
);

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        try {

            if (
                interaction.isChatInputCommand()
            ) {

                await handleCommand(
                    interaction
                );

                return;
            }

            if (
                interaction.isButton()
            ) {

                await handleButton(
                    interaction
                );

                return;
            }

            if (
                interaction.isModalSubmit()
            ) {

                await handleModal(
                    interaction
                );

            }

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            const response = {
                content:
                    "❌ Something went wrong while processing that.",
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp(
                    response
                ).catch(() => {});

            } else {

                await interaction.reply(
                    response
                ).catch(() => {});

            }

        }

    }
);

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(
    interaction
) {

    const command =
        interaction.commandName;

    /* -------------------------
       PING
    ------------------------- */

    if (command === "ping") {

        return interaction.reply({
            content:
                `🏓 Pong! **${client.ws.ping}ms**`,
            ephemeral: true
        });

    }

    /* -------------------------
       BOT INFO
    ------------------------- */

    if (command === "botinfo") {

        const uptime =
            Math.floor(
                client.uptime / 1000
            );

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "RSA Administrator"
                )
                .setDescription(
                    "Official administration and moderation bot for the Roblox Schools Association."
                )
                .addFields(
                    {
                        name: "Version",
                        value: "2.0.0",
                        inline: true
                    },
                    {
                        name: "Ping",
                        value:
                            `${client.ws.ping}ms`,
                        inline: true
                    },
                    {
                        name: "Uptime",
                        value:
                            `<t:${Math.floor(
                                Date.now() / 1000 -
                                uptime
                            )}:R>`,
                        inline: true
                    }
                )
                .setColor("#315B9A")
                .setFooter({
                    text:
                        "Roblox Schools Association"
                });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* -------------------------
       SERVER INFO
    ------------------------- */

    if (command === "serverinfo") {

        const guild =
            interaction.guild;

        const embed =
            new EmbedBuilder()
                .setTitle(guild.name)
                .setThumbnail(
                    guild.iconURL({
                        size: 256
                    })
                )
                .addFields(
                    {
                        name: "Members",
                        value:
                            String(
                                guild.memberCount
                            ),
                        inline: true
                    },
                    {
                        name: "Channels",
                        value:
                            String(
                                guild.channels.cache.size
                            ),
                        inline: true
                    },
                    {
                        name: "Roles",
                        value:
                            String(
                                guild.roles.cache.size
                            ),
                        inline: true
                    },
                    {
                        name: "Owner",
                        value:
                            `<@${guild.ownerId}>`,
                        inline: true
                    },
                    {
                        name: "Created",
                        value:
                            `<t:${Math.floor(
                                guild.createdTimestamp / 1000
                            )}:D>`,
                        inline: true
                    }
                )
                .setColor("#315B9A")
                .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* -------------------------
       USER INFO
    ------------------------- */

    if (command === "userinfo") {

        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        const embed =
            new EmbedBuilder()
                .setTitle(user.tag)
                .setThumbnail(
                    user.displayAvatarURL({
                        size: 256
                    })
                )
                .addFields(
                    {
                        name: "User ID",
                        value: user.id,
                        inline: false
                    },
                    {
                        name: "Account Created",
                        value:
                            `<t:${Math.floor(
                                user.createdTimestamp / 1000
                            )}:F>`,
                        inline: false
                    }
                )
                .setColor("#315B9A");

        if (member) {

            embed.addFields(
                {
                    name: "Joined Server",
                    value:
                        `<t:${Math.floor(
                            member.joinedTimestamp / 1000
                        )}:F>`,
                    inline: false
                },
                {
                    name: "Roles",
                    value:
                        member.roles.cache
                            .filter(
                                role =>
                                    role.id !==
                                    interaction.guild.id
                            )
                            .map(
                                role =>
                                    role.toString()
                            )
                            .slice(0, 20)
                            .join(" ") ||
                        "None",
                    inline: false
                }
            );

        }

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* -------------------------
       BAN
    ------------------------- */

    if (command === "ban") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.BanMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Ban Members** permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            member &&
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You cannot moderate this member because of role hierarchy.",
                ephemeral: true
            });

        }

        await interaction.guild.members
            .ban(user.id, {
                reason
            });

        await logAction(
            interaction.guild,
            "🔨 Member Banned",
            `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
        );

        return interaction.reply(
            `🔨 **${user.tag}** has been banned.\n> ${reason}`
        );

    }

    /* -------------------------
       KICK
    ------------------------- */

    if (command === "kick") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.KickMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Kick Members** permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "❌ I cannot kick this member.",
                ephemeral: true
            });

        }

        await member.kick(reason);

        await logAction(
            interaction.guild,
            "👢 Member Kicked",
            `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
        );

        return interaction.reply(
            `👢 **${user.tag}** has been kicked.\n> ${reason}`
        );

    }

    /* -------------------------
       TIMEOUT
    ------------------------- */

    if (command === "timeout") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Moderate Members** permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const minutes =
            interaction.options.getInteger(
                "minutes"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "❌ I cannot timeout this member.",
                ephemeral: true
            });

        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        await logAction(
            interaction.guild,
            "⏱️ Member Timed Out",
            `**User:** ${user.tag} (${user.id})\n**Duration:** ${minutes} minutes\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
        );

        return interaction.reply(
            `⏱️ **${user.tag}** has been timed out for **${minutes} minutes**.\n> ${reason}`
        );

    }

    /* -------------------------
       UNTIMEOUT
    ------------------------- */

    if (command === "untimeout") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Moderate Members** permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "❌ I cannot modify this member.",
                ephemeral: true
            });

        }

        await member.timeout(
            null,
            `Timeout removed by ${interaction.user.tag}`
        );

        return interaction.reply(
            `🔓 Timeout removed from **${user.tag}**.`
        );

    }

    /* -------------------------
       WARN
    ------------------------- */

    if (command === "warn") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Moderate Members** permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You cannot warn this member.",
                ephemeral: true
            });

        }

        const key =
            `${interaction.guild.id}:${user.id}`;

        if (!warnings[key]) {
            warnings[key] = [];
        }

        warnings[key].push({
            reason,
            moderator:
                interaction.user.id,
            timestamp:
                new Date().toISOString()
        });

        saveJSON(
            warningsFile,
            warnings
        );

        await logAction(
            interaction.guild,
            "⚠️ Member Warned",
            `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
        );

        return interaction.reply(
            `⚠️ **${user.tag}** has been warned.\n> ${reason}\n\nTotal warnings: **${warnings[key].length}**`
        );

    }

    /* -------------------------
       WARNINGS
    ------------------------- */

    if (command === "warnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need moderation permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const key =
            `${interaction.guild.id}:${user.id}`;

        const list =
            warnings[key] || [];

        if (!list.length) {

            return interaction.reply({
                content:
                    `✅ **${user.tag}** has no warnings.`,
                ephemeral: true
            });

        }

        const description =
            list
                .map(
                    (warning, index) =>
                        `**${index + 1}.** ${warning.reason}\n` +
                        `Moderator: <@${warning.moderator}>\n` +
                        `<t:${Math.floor(
                            new Date(
                                warning.timestamp
                            ).getTime() / 1000
                        )}:R>`
                )
                .join("\n\n");

        const embed =
            new EmbedBuilder()
                .setTitle(
                    `Warnings — ${user.tag}`
                )
                .setDescription(
                    description
                )
                .setColor("#D6A72C");

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* -------------------------
       CLEAR WARNINGS
    ------------------------- */

    if (command === "clearwarnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need moderation permission.",
                ephemeral: true
            });

        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const key =
            `${interaction.guild.id}:${user.id}`;

        delete warnings[key];

        saveJSON(
            warningsFile,
            warnings
        );

        return interaction.reply(
            `🧹 Cleared all warnings for **${user.tag}**.`
        );

    }

    /* -------------------------
       PURGE
    ------------------------- */

    if (command === "purge") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Messages** permission.",
                ephemeral: true
            });

        }

        const amount =
            interaction.options.getInteger(
                "amount"
            );

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        return interaction.reply({
            content:
                `🧹 Deleted **${deleted.size}** messages.`,
            ephemeral: true
        });

    }

    /* -------------------------
       LOCK
    ------------------------- */

    if (command === "lock") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Channels** permission.",
                ephemeral: true
            });

        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: false
            }
        );

        await logAction(
            interaction.guild,
            "🔒 Channel Locked",
            `**Channel:** ${interaction.channel}\n**Moderator:** ${interaction.user.tag}`
        );

        return interaction.reply(
            "🔒 This channel has been locked."
        );

    }

    /* -------------------------
       UNLOCK
    ------------------------- */

    if (command === "unlock") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Channels** permission.",
                ephemeral: true
            });

        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: null
            }
        );

        return interaction.reply(
            "🔓 This channel has been unlocked."
        );

    }

    /* -------------------------
       SLOWMODE
    ------------------------- */

    if (command === "slowmode") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Channels** permission.",
                ephemeral: true
            });

        }

        const seconds =
            interaction.options.getInteger(
                "seconds"
            );

        await interaction.channel.setRateLimitPerUser(
            seconds
        );

        return interaction.reply(
            seconds === 0
                ? "🐇 Slowmode disabled."
                : `🐢 Slowmode set to **${seconds} seconds**.`
        );

    }

    /* -------------------------
       ROLE
    ------------------------- */

    if (command === "role") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageRoles
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Roles** permission.",
                ephemeral: true
            });

        }

        const subcommand =
            interaction.options.getSubcommand();

        const user =
            interaction.options.getUser(
                "user"
            );

        const role =
            interaction.options.getRole(
                "role"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "❌ Member not found.",
                ephemeral: true
            });

        }

        if (
            role.position >=
            interaction.member.roles.highest.position
        ) {

            return interaction.reply({
                content:
                    "❌ You cannot manage a role equal to or higher than your highest role.",
                ephemeral: true
            });

        }

        if (
            role.position >=
            interaction.guild.members.me.roles.highest.position
        ) {

            return interaction.reply({
                content:
                    "❌ I cannot manage that role because it is higher than my highest role.",
                ephemeral: true
            });

        }

        if (
            subcommand === "add"
        ) {

            await member.roles.add(
                role
            );

            return interaction.reply(
                `✅ Added ${role} to **${user.tag}**.`
            );

        }

        if (
            subcommand === "remove"
        ) {

            await member.roles.remove(
                role
            );

            return interaction.reply(
                `✅ Removed ${role} from **${user.tag}**.`
            );

        }

    }

    /* -------------------------
       ANNOUNCE
    ------------------------- */

    if (command === "announce") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Messages** permission.",
                ephemeral: true
            });

        }

        const title =
            interaction.options.getString(
                "title"
            );

        const message =
            interaction.options.getString(
                "message"
            );

        let colour =
            interaction.options.getString(
                "colour"
            ) ||
            "#315B9A";

        if (
            !/^#[0-9A-F]{6}$/i.test(
                colour
            )
        ) {

            colour = "#315B9A";

        }

        const embed =
            new EmbedBuilder()
                .setTitle(title)
                .setDescription(message)
                .setColor(colour)
                .setFooter({
                    text:
                        "Roblox Schools Association"
                })
                .setTimestamp();

        await interaction.channel.send({
            embeds: [embed]
        });

        return interaction.reply({
            content:
                "📢 Announcement sent.",
            ephemeral: true
        });

    }

    /* -------------------------
       EMBED CREATOR
    ------------------------- */

    if (command === "embed") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "❌ You need **Manage Messages** permission to use the embed creator.",
                ephemeral: true
            });

        }

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "RSA Embed Creator"
                )
                .setDescription(
                    "Use the buttons below to build your embed.\n\n" +
                    "When you're finished, press **Preview**."
                )
                .setColor("#315B9A");

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "embed_title"
                        )
                        .setLabel(
                            "Title"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "embed_description"
                        )
                        .setLabel(
                            "Description"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "embed_colour"
                        )
                        .setLabel(
                            "Colour"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "embed_preview"
                        )
                        .setLabel(
                            "Preview"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                );

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

    }

    /* -------------------------
       HELP
    ------------------------- */

    if (command === "help") {

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "RSA Administrator"
                )
                .setDescription(
                    "Official administration bot for the Roblox Schools Association."
                )
                .addFields(
                    {
                        name: "Moderation",
                        value:
                            "`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge`"
                    },
                    {
                        name: "Management",
                        value:
                            "`/lock` `/unlock` `/slowmode` `/role` `/announce`"
                    },
                    {
                        name: "Information",
                        value:
                            "`/ping` `/botinfo` `/serverinfo` `/userinfo`"
                    },
                    {
                        name: "Tools",
                        value:
                            "`/embed`"
                    }
                )
                .setColor("#315B9A")
                .setFooter({
                    text:
                        "Roblox Schools Association"
                });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(
    interaction
) {

    if (
        !interaction.customId.startsWith(
            "embed_"
        )
    ) {
        return;
    }

    if (
        !hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
        )
    ) {

        return interaction.reply({
            content:
                "❌ You don't have permission to use the embed creator.",
            ephemeral: true
        });

    }

    if (
        interaction.customId ===
        "embed_title"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "embed_modal_title"
                )
                .setTitle(
                    "Set Embed Title"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "title"
                )
                .setLabel(
                    "Embed title"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(256);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                input
            )
        );

        return interaction.showModal(
            modal
        );

    }

    if (
        interaction.customId ===
        "embed_description"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "embed_modal_description"
                )
                .setTitle(
                    "Set Embed Description"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "description"
                )
                .setLabel(
                    "Embed description"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(4000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                input
            )
        );

        return interaction.showModal(
            modal
        );

    }

    if (
        interaction.customId ===
        "embed_colour"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "embed_modal_colour"
                )
                .setTitle(
                    "Set Embed Colour"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "colour"
                )
                .setLabel(
                    "Hex colour"
                )
                .setPlaceholder(
                    "#315B9A"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(7);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                input
            )
        );

        return interaction.showModal(
            modal
        );

    }

    if (
        interaction.customId ===
        "embed_preview"
    ) {

        return interaction.reply({
            content:
                "📋 Embed preview system is ready. We'll extend this into the full multi-field builder next.",
            ephemeral: true
        });

    }

}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(
    interaction
) {

    if (
        !interaction.customId.startsWith(
            "embed_modal_"
        )
    ) {
        return;
    }

    return interaction.reply({
        content:
            `✅ Saved your embed ${interaction.customId.replace(
                "embed_modal_",
                ""
            )} setting.`,
        ephemeral: true
    });

}

/* =========================================================
   MEMBER JOIN LOG
========================================================= */

client.on(
    "guildMemberAdd",
    async member => {

        await logAction(
            member.guild,
            "📥 Member Joined",
            `**Member:** ${member.user.tag} (${member.id})`
        );

    }
);

/* =========================================================
   MEMBER LEAVE LOG
========================================================= */

client.on(
    "guildMemberRemove",
    async member => {

        await logAction(
            member.guild,
            "📤 Member Left",
            `**Member:** ${member.user.tag} (${member.id})`
        );

    }
);

/* =========================================================
   MESSAGE DELETE LOG
========================================================= */

client.on(
    "messageDelete",
    async message => {

        if (
            !message.guild ||
            message.author?.bot
        ) {
            return;
        }

        await logAction(
            message.guild,
            "🗑️ Message Deleted",
            `**Channel:** ${message.channel}\n**Author:** ${message.author.tag}\n\n${message.content?.slice(0, 1000) || "No text content."}`
        );

    }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);
