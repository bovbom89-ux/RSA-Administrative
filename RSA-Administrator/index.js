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
    TextInputStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   ENVIRONMENT
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("❌ CLIENT_ID is missing.");
    process.exit(1);
}

if (!GUILD_ID) {
    console.error("❌ GUILD_ID is missing.");
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
   DATA
========================================================= */

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

const WARNINGS_FILE =
    path.join(DATA_DIR, "warnings.json");

const CONFIG_FILE =
    path.join(DATA_DIR, "config.json");

function load(file, fallback) {

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
            fs.readFileSync(file, "utf8")
        );

    } catch (error) {

        console.error(
            `Failed to load ${file}:`,
            error
        );

        return fallback;
    }
}

function save(file, data) {

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
            `Failed to save ${file}:`,
            error
        );
    }
}

const warnings =
    load(WARNINGS_FILE, {});

const configs =
    load(CONFIG_FILE, {});

/* =========================================================
   EMBED SESSIONS
========================================================= */

const embedSessions = new Map();

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("View RSA Administrator commands."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View RSA Administrator information."),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View server information."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View information about a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to inspect.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to ban.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to kick.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to timeout.")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Timeout duration in minutes.")
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Warning reason.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete recent messages.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages.")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel."),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel."),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Change channel slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode in seconds.")
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage member roles.")
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Add a role.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member.")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("Role.")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Remove a role.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("Member.")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("Role.")
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Create an RSA announcement.")
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Announcement title.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Announcement message.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("colour")
                .setDescription("Hex colour, e.g. #315B9A.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Open the RSA embed creator."),

    new SlashCommandBuilder()
        .setName("setlogs")
        .setDescription("Set the moderation log channel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Logging channel.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("View the current log channel.")

].map(command => command.toJSON());

/* =========================================================
   REGISTER
========================================================= */

async function registerCommands() {

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    console.log("Registering RSA Administrator commands...");

    await rest.put(
        Routes.applicationGuildCommands(
            CLIENT_ID,
            GUILD_ID
        ),
        {
            body: commands
        }
    );

    console.log("✅ Slash commands registered.");
}

/* =========================================================
   PERMISSIONS
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
    member
) {

    if (!member) {
        return false;
    }

    if (member.id === interaction.user.id) {
        return false;
    }

    if (member.id === interaction.guild.ownerId) {
        return false;
    }

    if (
        interaction.member.id !==
        interaction.guild.ownerId
    ) {

        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return false;
        }
    }

    if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
    ) {
        return false;
    }

    return true;
}

function validHex(value) {

    return /^#[0-9A-F]{6}$/i.test(value);
}

/* =========================================================
   LOGGING
========================================================= */

async function logAction(
    guild,
    title,
    description,
    colour = "#315B9A"
) {

    const config =
        configs[guild.id];

    if (!config?.logChannel) {
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
            .setColor(colour)
            .setTimestamp()
            .setFooter({
                text:
                    "RSA Administrator"
            });

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
            `✅ Logged in as ${client.user.tag}`
        );

        client.user.setPresence({
            status: "online",
            activities: [
                {
                    name:
                        "Roblox Schools Association",
                    type: 3
                }
            ]
        });

        try {

            await registerCommands();

        } catch (error) {

            console.error(
                "❌ Command registration failed:",
                error
            );

        }

    }
);

/* =========================================================
   COMMAND INTERACTION
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        try {

            if (
                interaction.isChatInputCommand()
            ) {

                await commandHandler(
                    interaction
                );

            } else if (
                interaction.isButton()
            ) {

                await buttonHandler(
                    interaction
                );

            } else if (
                interaction.isModalSubmit()
            ) {

                await modalHandler(
                    interaction
                );

            }

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            const message = {
                content:
                    "❌ An unexpected error occurred.",
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp(
                    message
                ).catch(() => {});

            } else {

                await interaction.reply(
                    message
                ).catch(() => {});

            }

        }

    }
);

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function commandHandler(
    interaction
) {

    const command =
        interaction.commandName;

    /* ---------- PING ---------- */

    if (command === "ping") {

        return interaction.reply({
            content:
                `🏓 **Pong!** ${client.ws.ping}ms`,
            ephemeral: true
        });

    }

    /* ---------- BOT INFO ---------- */

    if (command === "botinfo") {

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "RSA Administrator"
                )
                .setDescription(
                    "The official administration bot for the Roblox Schools Association."
                )
                .addFields(
                    {
                        name: "Version",
                        value: "3.0.0",
                        inline: true
                    },
                    {
                        name: "Latency",
                        value:
                            `${client.ws.ping}ms`,
                        inline: true
                    },
                    {
                        name: "Servers",
                        value:
                            String(
                                client.guilds.cache.size
                            ),
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

    /* ---------- SERVER INFO ---------- */

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
                            `${guild.memberCount}`,
                        inline: true
                    },
                    {
                        name: "Channels",
                        value:
                            `${guild.channels.cache.size}`,
                        inline: true
                    },
                    {
                        name: "Roles",
                        value:
                            `${guild.roles.cache.size}`,
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
                                guild.createdTimestamp /
                                1000
                            )}:D>`,
                        inline: true
                    }
                )
                .setColor("#315B9A");

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* ---------- USER INFO ---------- */

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

        const roles =
            member
                ? member.roles.cache
                    .filter(
                        role =>
                            role.id !==
                            interaction.guild.id
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .map(
                        role =>
                            role.toString()
                    )
                    .slice(0, 15)
                    .join(" ")
                : "Not in server";

        const embed =
            new EmbedBuilder()
                .setTitle(
                    user.tag
                )
                .setThumbnail(
                    user.displayAvatarURL({
                        size: 256
                    })
                )
                .addFields(
                    {
                        name: "User ID",
                        value: user.id
                    },
                    {
                        name: "Account Created",
                        value:
                            `<t:${Math.floor(
                                user.createdTimestamp /
                                1000
                            )}:F>`
                    },
                    {
                        name: "Server Joined",
                        value:
                            member
                                ? `<t:${Math.floor(
                                    member.joinedTimestamp /
                                    1000
                                )}:F>`
                                : "Not in server"
                    },
                    {
                        name: "Roles",
                        value: roles
                    }
                )
                .setColor("#315B9A");

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* ---------- BAN ---------- */

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
            interaction.options.getUser("user");

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

        await interaction.guild.members.ban(
            user.id,
            {
                reason
            }
        );

        await logAction(
            interaction.guild,
            "🔨 Member Banned",
            `**Member:** ${user.tag}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
            "#D83C3C"
        );

        return interaction.reply(
            `🔨 **${user.tag}** has been banned.\n> ${reason}`
        );

    }

    /* ---------- KICK ---------- */

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
            interaction.options.getUser("user");

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
                    "❌ You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        await logAction(
            interaction.guild,
            "👢 Member Kicked",
            `**Member:** ${user.tag}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
            "#E67E22"
        );

        return interaction.reply(
            `👢 **${user.tag}** has been kicked.\n> ${reason}`
        );

    }

    /* ---------- TIMEOUT ---------- */

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
            interaction.options.getUser("user");

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
                    "❌ You cannot timeout this member.",
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
            `**Member:** ${user.tag}\n**Duration:** ${minutes} minutes\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
            "#E67E22"
        );

        return interaction.reply(
            `⏱️ **${user.tag}** has been timed out for **${minutes} minutes**.\n> ${reason}`
        );

    }

    /* ---------- UNTIMEOUT ---------- */

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
            interaction.options.getUser("user");

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
                    "❌ You cannot modify this member.",
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

    /* ---------- WARN ---------- */

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
            interaction.options.getUser("user");

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
                Date.now()
        });

        save(
            WARNINGS_FILE,
            warnings
        );

        await logAction(
            interaction.guild,
            "⚠️ Member Warned",
            `**Member:** ${user.tag}\n**Moderator:** ${interaction.user}\n**Reason:** ${reason}`,
            "#F1C40F"
        );

        return interaction.reply(
            `⚠️ **${user.tag}** has been warned.\n> ${reason}\n\nWarnings: **${warnings[key].length}**`
        );

    }

    /* ---------- WARNINGS ---------- */

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
            interaction.options.getUser("user");

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
                    (item, index) =>
                        `**${index + 1}.** ${item.reason}\n` +
                        `Moderator: <@${item.moderator}>\n` +
                        `<t:${Math.floor(
                            item.timestamp /
                            1000
                        )}:R>`
                )
                .join("\n\n");

        const embed =
            new EmbedBuilder()
                .setTitle(
                    `Warnings — ${user.tag}`
                )
                .setDescription(
                    description.slice(
                        0,
                        4000
                    )
                )
                .setColor("#F1C40F");

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    /* ---------- CLEAR WARNINGS ---------- */

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
            interaction.options.getUser("user");

        const key =
            `${interaction.guild.id}:${user.id}`;

        delete warnings[key];

        save(
            WARNINGS_FILE,
            warnings
        );

        return interaction.reply(
            `🧹 Cleared warnings for **${user.tag}**.`
        );

    }

    /* ---------- PURGE ---------- */

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

    /* ---------- LOCK ---------- */

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
            `**Channel:** ${interaction.channel}\n**Moderator:** ${interaction.user}`
        );

        return interaction.reply(
            "🔒 This channel has been locked."
        );

    }

    /* ---------- UNLOCK ---------- */

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

    /* ---------- SLOWMODE ---------- */

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

    /* ---------- ROLE ---------- */

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
            interaction.options.getUser("user");

        const role =
            interaction.options.getRole("role");

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
                    "❌ You cannot manage that role.",
                ephemeral: true
            });
        }

        if (
            role.position >=
            interaction.guild.members.me.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "❌ My role is not high enough to manage that role.",
                ephemeral: true
            });
        }

        if (subcommand === "add") {

            await member.roles.add(role);

            return interaction.reply(
                `✅ Added ${role} to **${user.tag}**.`
            );

        }

        await member.roles.remove(role);

        return interaction.reply(
            `✅ Removed ${role} from **${user.tag}**.`
        );

    }

    /* ---------- ANNOUNCE ---------- */

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
            interaction.options.getString("title");

        const message =
            interaction.options.getString("message");

        let colour =
            interaction.options.getString("colour") ||
            "#315B9A";

        if (!validHex(colour)) {
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

    /* ---------- EMBED ---------- */

    if (command === "embed") {

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

        const session = {
            title: "",
            description: "",
            colour: "#315B9A",
            footer: "",
            image: "",
            thumbnail: "",
            fields: []
        };

        embedSessions.set(
            interaction.user.id,
            session
        );

        return sendEmbedBuilder(
            interaction
        );

    }

    /* ---------- SET LOGS ---------- */

    if (command === "setlogs") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {
            return interaction.reply({
                content:
                    "❌ You need **Manage Server** permission.",
                ephemeral: true
            });
        }

        const channel =
            interaction.options.getChannel(
                "channel"
            );

        configs[interaction.guild.id] = {
            ...(configs[interaction.guild.id] || {}),
            logChannel: channel.id
        };

        save(
            CONFIG_FILE,
            configs
        );

        return interaction.reply(
            `✅ Moderation logs will now be sent to ${channel}.`
        );

    }

    /* ---------- LOGS ---------- */

    if (command === "logs") {

        const channel =
            configs[interaction.guild.id]?.logChannel;

        return interaction.reply({
            content:
                channel
                    ? `📋 Current log channel: <#${channel}>`
                    : "📋 No log channel has been configured.",
            ephemeral: true
        });

    }

    /* ---------- HELP ---------- */

    if (command === "help") {

        const embed =
            new EmbedBuilder()
                .setTitle(
                    "RSA Administrator"
                )
                .setDescription(
                    "Official administration system for the Roblox Schools Association."
                )
                .addFields(
                    {
                        name: "🛡️ Moderation",
                        value:
                            "`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge`"
                    },
                    {
                        name: "⚙️ Management",
                        value:
                            "`/lock` `/unlock` `/slowmode` `/role` `/announce`"
                    },
                    {
                        name: "📋 Information",
                        value:
                            "`/serverinfo` `/userinfo` `/botinfo` `/ping`"
                    },
                    {
                        name: "🎨 Tools",
                        value:
                            "`/embed` `/setlogs` `/logs`"
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
   EMBED BUILDER
========================================================= */

async function sendEmbedBuilder(
    interaction
) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return;
    }

    const preview =
        createEmbed(
            session
        );

    const controls =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "eb_title"
                    )
                    .setLabel(
                        "Title"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "eb_description"
                    )
                    .setLabel(
                        "Description"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "eb_colour"
                    )
                    .setLabel(
                        "Colour"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "eb_extra"
                    )
                    .setLabel(
                        "Images & Footer"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    const controls2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "eb_field"
                    )
                    .setLabel(
                        "Add Field"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "eb_preview"
                    )
                    .setLabel(
                        "Preview"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "eb_send"
                    )
                    .setLabel(
                        "Send"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "eb_cancel"
                    )
                    .setLabel(
                        "Cancel"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    const content =
        "### RSA Embed Creator\n" +
        "Build your announcement below, then press **Send** when you're ready.";

    const payload = {
        content,
        embeds: [preview],
        components: [
            controls,
            controls2
        ],
        ephemeral: true
    };

    if (interaction.replied) {

        return interaction.editReply(
            payload
        );

    }

    return interaction.reply(
        payload
    );

}

function createEmbed(
    session
) {

    const embed =
        new EmbedBuilder()
            .setColor(
                validHex(session.colour)
                    ? session.colour
                    : "#315B9A"
            );

    if (session.title) {
        embed.setTitle(
            session.title
        );
    }

    if (session.description) {
        embed.setDescription(
            session.description
        );
    }

    if (session.thumbnail) {
        embed.setThumbnail(
            session.thumbnail
        );
    }

    if (session.image) {
        embed.setImage(
            session.image
        );
    }

    if (session.footer) {
        embed.setFooter({
            text: session.footer
        });
    }

    if (session.fields.length) {
        embed.addFields(
            session.fields
        );
    }

    return embed;
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function buttonHandler(
    interaction
) {

    if (
        !interaction.customId.startsWith(
            "eb_"
        )
    ) {
        return;
    }

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return interaction.reply({
            content:
                "❌ Your embed session has expired. Run `/embed` again.",
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "eb_title"
    ) {

        return showModal(
            interaction,
            "modal_title",
            "Set Embed Title",
            "title",
            "Title",
            TextInputStyle.Short,
            session.title
        );

    }

    if (
        interaction.customId ===
        "eb_description"
    ) {

        return showModal(
            interaction,
            "modal_description",
            "Set Embed Description",
            "description",
            "Description",
            TextInputStyle.Paragraph,
            session.description
        );

    }

    if (
        interaction.customId ===
        "eb_colour"
    ) {

        return showModal(
            interaction,
            "modal_colour",
            "Set Embed Colour",
            "colour",
            "Hex Colour",
            TextInputStyle.Short,
            session.colour
        );

    }

    if (
        interaction.customId ===
        "eb_extra"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_extra"
                )
                .setTitle(
                    "Images & Footer"
                );

        const footer =
            new TextInputBuilder()
                .setCustomId(
                    "footer"
                )
                .setLabel(
                    "Footer text"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.footer.slice(
                        0,
                        2048
                    )
                );

        const image =
            new TextInputBuilder()
                .setCustomId(
                    "image"
                )
                .setLabel(
                    "Image URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.image.slice(
                        0,
                        4000
                    )
                );

        const thumbnail =
            new TextInputBuilder()
                .setCustomId(
                    "thumbnail"
                )
                .setLabel(
                    "Thumbnail URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.thumbnail.slice(
                        0,
                        4000
                    )
                );

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                footer
            ),
            new ActionRowBuilder().addComponents(
                image
            ),
            new ActionRowBuilder().addComponents(
                thumbnail
            )
        );

        return interaction.showModal(
            modal
        );

    }

    if (
        interaction.customId ===
        "eb_field"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_field"
                )
                .setTitle(
                    "Add Embed Field"
                );

        const name =
            new TextInputBuilder()
                .setCustomId(
                    "name"
                )
                .setLabel(
                    "Field name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(256);

        const value =
            new TextInputBuilder()
                .setCustomId(
                    "value"
                )
                .setLabel(
                    "Field value"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1024);

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                name
            ),
            new ActionRowBuilder().addComponents(
                value
            )
        );

        return interaction.showModal(
            modal
        );

    }

    if (
        interaction.customId ===
        "eb_preview"
    ) {

        return interaction.reply({
            content:
                "### Embed Preview",
            embeds: [
                createEmbed(session)
            ],
            ephemeral: true
        });

    }

    if (
        interaction.customId ===
        "eb_send"
    ) {

        await interaction.channel.send({
            embeds: [
                createEmbed(session)
            ]
        });

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "✅ Embed sent successfully.",
            embeds: [],
            components: []
        });

    }

    if (
        interaction.customId ===
        "eb_cancel"
    ) {

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "❌ Embed creation cancelled.",
            embeds: [],
            components: []
        });

    }

}

/* =========================================================
   MODALS
========================================================= */

async function showModal(
    interaction,
    customId,
    title,
    inputId,
    label,
    style,
    value
) {

    const modal =
        new ModalBuilder()
            .setCustomId(customId)
            .setTitle(title);

    const input =
        new TextInputBuilder()
            .setCustomId(inputId)
            .setLabel(label)
            .setStyle(style)
            .setRequired(false)
            .setMaxLength(
                style ===
                TextInputStyle.Paragraph
                    ? 4000
                    : 256
            );

    if (value) {
        input.setValue(
            value.slice(
                0,
                style ===
                    TextInputStyle.Paragraph
                    ? 4000
                    : 256
            )
        );
    }

    modal.addComponents(
        new ActionRowBuilder().addComponents(
            input
        )
    );

    return interaction.showModal(
        modal
    );

}

async function modalHandler(
    interaction
) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return interaction.reply({
            content:
                "❌ Your embed session has expired.",
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "modal_title"
    ) {

        session.title =
            interaction.fields.getTextInputValue(
                "title"
            );

    }

    if (
        interaction.customId ===
        "modal_description"
    ) {

        session.description =
            interaction.fields.getTextInputValue(
                "description"
            );

    }

    if (
        interaction.customId ===
        "modal_colour"
    ) {

        const colour =
            interaction.fields.getTextInputValue(
                "colour"
            );

        if (!validHex(colour)) {

            return interaction.reply({
                content:
                    "❌ Invalid colour. Use a hex colour such as `#315B9A`.",
                ephemeral: true
            });

        }

        session.colour =
            colour;

    }

    if (
        interaction.customId ===
        "modal_extra"
    ) {

        session.footer =
            interaction.fields.getTextInputValue(
                "footer"
            );

        session.image =
            interaction.fields.getTextInputValue(
                "image"
            );

        session.thumbnail =
            interaction.fields.getTextInputValue(
                "thumbnail"
            );

    }

    if (
        interaction.customId ===
        "modal_field"
    ) {

        const name =
            interaction.fields.getTextInputValue(
                "name"
            );

        const value =
            interaction.fields.getTextInputValue(
                "value"
            );

        if (
            session.fields.length >= 25
        ) {

            return interaction.reply({
                content:
                    "❌ Discord allows a maximum of 25 embed fields.",
                ephemeral: true
            });

        }

        session.fields.push({
            name,
            value,
            inline: false
        });

    }

    await interaction.reply({
        content:
            "✅ Updated your embed.",
        ephemeral: true
    });

}

/* =========================================================
   MEMBER LOGGING
========================================================= */

client.on(
    "guildMemberAdd",
    async member => {

        await logAction(
            member.guild,
            "📥 Member Joined",
            `**Member:** ${member.user.tag}\n**ID:** ${member.id}`,
            "#2ECC71"
        );

    }
);

client.on(
    "guildMemberRemove",
    async member => {

        await logAction(
            member.guild,
            "📤 Member Left",
            `**Member:** ${member.user.tag}\n**ID:** ${member.id}`,
            "#E74C3C"
        );

    }
);

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
            `**Author:** ${message.author?.tag || "Unknown"}\n**Channel:** ${message.channel}\n\n${message.content?.slice(0, 1500) || "No text content."}`,
            "#E74C3C"
        );

    }
);

/* =========================================================
   ERROR HANDLING
========================================================= */

client.on(
    "error",
    error => {

        console.error(
            "Discord client error:",
            error
        );

    }
);

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "Unhandled promise rejection:",
            error
        );

    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "Uncaught exception:",
            error
        );

    }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);
