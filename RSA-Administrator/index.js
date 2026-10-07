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
   CONFIG
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const EMBED_COLOUR = "#2F4DA8";
const RSA_LOGO = "<:Our_Logo:1557149633623363594>";
const BOT_VERSION = "5.0.0";

if (!TOKEN) {
    console.error("DISCORD_TOKEN is missing.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("CLIENT_ID is missing.");
    process.exit(1);
}

if (!GUILD_ID) {
    console.error("GUILD_ID is missing.");
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
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const WARNINGS_FILE = path.join(DATA_DIR, "warnings.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

function loadJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(fallback, null, 2)
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error(`Could not save ${file}:`, error);
    }
}

const warnings = loadJSON(WARNINGS_FILE, {});
const configs = loadJSON(CONFIG_FILE, {});

const embedSessions = new Map();

/* =========================================================
   EMBEDS
========================================================= */

function brandedTitle(title) {
    return `${RSA_LOGO} ${title}`;
}

function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOUR);

    if (options.title) {
        embed.setTitle(brandedTitle(options.title));
    }

    if (options.description) {
        embed.setDescription(options.description);
    }

    if (options.fields?.length) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    if (options.footer) {
        embed.setFooter({
            text: options.footer
        });
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    return embed;
}

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
        .setDescription("View information about RSA Administrator."),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View information about this server."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View information about a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Member to inspect.")
                .setRequired(false)
        ),

    /* MODERATION */

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
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(option =>
            option
                .setName("user_id")
                .setDescription("Discord user ID.")
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
                .setDescription("Member.")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Duration in minutes.")
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
                .setDescription("Reason.")
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

    /* CHANNEL MANAGEMENT */

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel."),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel."),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode seconds.")
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    /* ROLE MANAGEMENT */

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

    /* INFORMATION */

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View information about a role.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View information about a channel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel.")
                .setRequired(false)
        ),

    /* ANNOUNCEMENTS */

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
        ),

    /* EMBED */

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Open the interactive embed creator."),

    /* LOGGING */

    new SlashCommandBuilder()
        .setName("setlogs")
        .setDescription("Set the moderation log channel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Log channel.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("View the configured log channel.")

].map(command => command.toJSON());

/* =========================================================
   COMMAND REGISTRATION
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

    console.log("Commands registered.");
}

/* =========================================================
   PERMISSION HELPERS
========================================================= */

function hasPermission(interaction, permission) {
    return interaction.member.permissions.has(permission);
}

function canModerate(interaction, member) {
    if (!member) return false;

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

    const botMember =
        interaction.guild.members.me;

    if (
        botMember &&
        member.roles.highest.position >=
        botMember.roles.highest.position
    ) {
        return false;
    }

    return true;
}

function canManageRole(interaction, role) {
    if (role.id === interaction.guild.id) {
        return false;
    }

    if (
        role.position >=
        interaction.member.roles.highest.position &&
        interaction.member.id !== interaction.guild.ownerId
    ) {
        return false;
    }

    const botMember =
        interaction.guild.members.me;

    if (
        botMember &&
        role.position >=
        botMember.roles.highest.position
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
    const config = configs[guild.id];

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

    const embed = createEmbed({
        title,
        description
    });

    await channel.send({
        embeds: [embed]
    }).catch(() => {});
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {

    console.log(
        `Logged in as ${client.user.tag}`
    );

    client.user.setPresence({
        status: "online",
        activities: [
            {
                name: "Roblox Schools Association",
                type: 3
            }
        ]
    });

    try {
        await registerCommands();
    } catch (error) {
        console.error(
            "Command registration failed:",
            error
        );
    }
});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        try {

            if (interaction.isChatInputCommand()) {
                await handleCommand(interaction);
            }

            if (interaction.isButton()) {
                await handleButton(interaction);
            }

            if (interaction.isModalSubmit()) {
                await handleModal(interaction);
            }

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            const response = {
                content:
                    "An unexpected error occurred while processing that command.",
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {
                await interaction.followUp(response)
                    .catch(() => {});
            } else {
                await interaction.reply(response)
                    .catch(() => {});
            }
        }
    }
);

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(interaction) {

    const command =
        interaction.commandName;

    /* HELP */

    if (command === "help") {

        const embed = createEmbed({
            title: "RSA Administrator",
            description:
                "A complete administration and moderation system for the Roblox Schools Association.",
            fields: [
                {
                    name: "Moderation",
                    value:
                        "`/ban` `/unban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge`"
                },
                {
                    name: "Channel Management",
                    value:
                        "`/lock` `/unlock` `/slowmode`"
                },
                {
                    name: "Role Management",
                    value:
                        "`/role add` `/role remove`"
                },
                {
                    name: "Information",
                    value:
                        "`/serverinfo` `/userinfo` `/roleinfo` `/channelinfo` `/botinfo` `/ping`"
                },
                {
                    name: "Administration",
                    value:
                        "`/announce` `/embed` `/setlogs` `/logs`"
                }
            ],
            footer:
                "RSA Administrator"
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* PING */

    if (command === "ping") {

        const embed = createEmbed({
            title: "Bot Status",
            fields: [
                {
                    name: "Latency",
                    value: `${client.ws.ping}ms`,
                    inline: true
                },
                {
                    name: "Status",
                    value: "Online",
                    inline: true
                }
            ]
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* BOT INFO */

    if (command === "botinfo") {

        const embed = createEmbed({
            title: "RSA Administrator",
            description:
                "Administration and moderation bot for the Roblox Schools Association.",
            fields: [
                {
                    name: "Version",
                    value: BOT_VERSION,
                    inline: true
                },
                {
                    name: "Latency",
                    value: `${client.ws.ping}ms`,
                    inline: true
                },
                {
                    name: "Servers",
                    value: `${client.guilds.cache.size}`,
                    inline: true
                },
                {
                    name: "Discord.js",
                    value: require("discord.js").version,
                    inline: true
                }
            ],
            footer:
                "RSA Administrator"
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* SERVER INFO */

    if (command === "serverinfo") {

        const guild =
            interaction.guild;

        const embed = createEmbed({
            title: "Server Information",
            thumbnail:
                guild.iconURL({
                    size: 256
                }),
            fields: [
                {
                    name: "Server",
                    value: guild.name
                },
                {
                    name: "Members",
                    value: `${guild.memberCount}`,
                    inline: true
                },
                {
                    name: "Channels",
                    value: `${guild.channels.cache.size}`,
                    inline: true
                },
                {
                    name: "Roles",
                    value: `${guild.roles.cache.size}`,
                    inline: true
                },
                {
                    name: "Owner",
                    value: `<@${guild.ownerId}>`,
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
            ]
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* USER INFO */

    if (command === "userinfo") {

        const user =
            interaction.options.getUser("user") ||
            interaction.user;

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        const roles = member
            ? member.roles.cache
                .filter(
                    role =>
                        role.id !== interaction.guild.id
                )
                .sort(
                    (a, b) =>
                        b.position - a.position
                )
                .map(role => role.toString())
                .slice(0, 15)
                .join(" ") ||
                "No roles"
            : "Not in server";

        const embed = createEmbed({
            title: "User Information",
            thumbnail:
                user.displayAvatarURL({
                    size: 256
                }),
            fields: [
                {
                    name: "User",
                    value: `${user.tag}`
                },
                {
                    name: "User ID",
                    value: user.id
                },
                {
                    name: "Account Created",
                    value:
                        `<t:${Math.floor(
                            user.createdTimestamp / 1000
                        )}:F>`
                },
                {
                    name: "Joined Server",
                    value:
                        member
                            ? `<t:${Math.floor(
                                member.joinedTimestamp / 1000
                            )}:F>`
                            : "Not in server"
                },
                {
                    name: "Roles",
                    value: roles
                }
            ]
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* ROLE INFO */

    if (command === "roleinfo") {

        const role =
            interaction.options.getRole("role");

        const embed = createEmbed({
            title: "Role Information",
            fields: [
                {
                    name: "Role",
                    value: `${role}`
                },
                {
                    name: "Name",
                    value: role.name,
                    inline: true
                },
                {
                    name: "Role ID",
                    value: role.id,
                    inline: true
                },
                {
                    name: "Position",
                    value: `${role.position}`,
                    inline: true
                },
                {
                    name: "Members",
                    value: `${role.members.size}`,
                    inline: true
                },
                {
                    name: "Mentionable",
                    value: role.mentionable
                        ? "Yes"
                        : "No",
                    inline: true
                }
            ]
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* CHANNEL INFO */

    if (command === "channelinfo") {

        const channel =
            interaction.options.getChannel("channel") ||
            interaction.channel;

        const embed = createEmbed({
            title: "Channel Information",
            fields: [
                {
                    name: "Channel",
                    value: `${channel}`
                },
                {
                    name: "Name",
                    value: channel.name,
                    inline: true
                },
                {
                    name: "Channel ID",
                    value: channel.id,
                    inline: true
                },
                {
                    name: "Type",
                    value: channel.type.toString(),
                    inline: true
                }
            ]
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* BAN */

    if (command === "ban") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.BanMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Ban Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (member && !canModerate(interaction, member)) {
            return interaction.reply({
                content:
                    "You cannot ban this member because of the role hierarchy.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(
            user.id,
            { reason }
        );

        await logAction(
            interaction.guild,
            "Member Banned",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply({
            content:
                `**${user.tag}** has been banned.`,
            ephemeral: true
        });
    }

    /* UNBAN */

    if (command === "unban") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.BanMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Ban Members permission.",
                ephemeral: true
            });
        }

        const userId =
            interaction.options.getString("user_id");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        try {

            await interaction.guild.members.unban(
                userId,
                reason
            );

            await logAction(
                interaction.guild,
                "Member Unbanned",
                `User ID: ${userId}\nModerator: ${interaction.user}\nReason: ${reason}`
            );

            return interaction.reply({
                content:
                    `User **${userId}** has been unbanned.`,
                ephemeral: true
            });

        } catch {
            return interaction.reply({
                content:
                    "That user is not banned or the ID is invalid.",
                ephemeral: true
            });
        }
    }

    /* KICK */

    if (command === "kick") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.KickMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Kick Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content:
                    "You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        await logAction(
            interaction.guild,
            "Member Kicked",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply({
            content:
                `**${user.tag}** has been kicked.`,
            ephemeral: true
        });
    }

    /* TIMEOUT */

    if (command === "timeout") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const minutes =
            interaction.options.getInteger("minutes");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content:
                    "You cannot timeout this member.",
                ephemeral: true
            });
        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        await logAction(
            interaction.guild,
            "Member Timed Out",
            `Member: ${user.tag}\nDuration: ${minutes} minutes\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply({
            content:
                `**${user.tag}** has been timed out for **${minutes} minutes**.`,
            ephemeral: true
        });
    }

    /* UNTIMEOUT */

    if (command === "untimeout") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content:
                    "You cannot modify this member.",
                ephemeral: true
            });
        }

        await member.timeout(
            null,
            `Timeout removed by ${interaction.user.tag}`
        );

        await logAction(
            interaction.guild,
            "Timeout Removed",
            `Member: ${user.tag}\nModerator: ${interaction.user}`
        );

        return interaction.reply({
            content:
                `Timeout removed from **${user.tag}**.`,
            ephemeral: true
        });
    }

    /* WARN */

    if (command === "warn") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason");

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content:
                    "You cannot warn this member.",
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
            moderator: interaction.user.id,
            timestamp: Date.now()
        });

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        await logAction(
            interaction.guild,
            "Member Warned",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply({
            content:
                `**${user.tag}** has been warned.`,
            ephemeral: true
        });
    }

    /* WARNINGS */

    if (command === "warnings") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
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

            const embed = createEmbed({
                title: "Warnings",
                description:
                    `**${user.tag}** has no warnings.`
            });

            return interaction.reply({
                embeds: [embed],
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
                            item.timestamp / 1000
                        )}:R>`
                )
                .join("\n\n");

        const embed = createEmbed({
            title: `Warnings — ${user.tag}`,
            description:
                description.slice(0, 4000)
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* CLEAR WARNINGS */

    if (command === "clearwarnings") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ModerateMembers
        )) {
            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        const key =
            `${interaction.guild.id}:${user.id}`;

        delete warnings[key];

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        await logAction(
            interaction.guild,
            "Warnings Cleared",
            `Member: ${user.tag}\nModerator: ${interaction.user}`
        );

        return interaction.reply({
            content:
                `Warnings cleared for **${user.tag}**.`,
            ephemeral: true
        });
    }

    /* PURGE */

    if (command === "purge") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const amount =
            interaction.options.getInteger("amount");

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        await logAction(
            interaction.guild,
            "Messages Purged",
            `Channel: ${interaction.channel}\nModerator: ${interaction.user}\nMessages deleted: ${deleted.size}`
        );

        return interaction.reply({
            content:
                `Deleted **${deleted.size}** messages.`,
            ephemeral: true
        });
    }

    /* LOCK */

    if (command === "lock") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
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
            "Channel Locked",
            `Channel: ${interaction.channel}\nModerator: ${interaction.user}`
        );

        return interaction.reply({
            content:
                "This channel has been locked.",
            ephemeral: true
        });
    }

    /* UNLOCK */

    if (command === "unlock") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: null
            }
        );

        await logAction(
            interaction.guild,
            "Channel Unlocked",
            `Channel: ${interaction.channel}\nModerator: ${interaction.user}`
        );

        return interaction.reply({
            content:
                "This channel has been unlocked.",
            ephemeral: true
        });
    }

    /* SLOWMODE */

    if (command === "slowmode") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        const seconds =
            interaction.options.getInteger("seconds");

        await interaction.channel.setRateLimitPerUser(
            seconds
        );

        await logAction(
            interaction.guild,
            "Slowmode Changed",
            `Channel: ${interaction.channel}\nDuration: ${seconds} seconds\nModerator: ${interaction.user}`
        );

        return interaction.reply({
            content:
                seconds === 0
                    ? "Slowmode disabled."
                    : `Slowmode set to **${seconds} seconds**.`,
            ephemeral: true
        });
    }

    /* ROLE */

    if (command === "role") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageRoles
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Roles permission.",
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
                    "Member not found.",
                ephemeral: true
            });
        }

        if (!canManageRole(interaction, role)) {
            return interaction.reply({
                content:
                    "You cannot manage that role.",
                ephemeral: true
            });
        }

        if (subcommand === "add") {

            await member.roles.add(role);

            await logAction(
                interaction.guild,
                "Role Added",
                `Role: ${role}\nMember: ${user.tag}\nModerator: ${interaction.user}`
            );

            return interaction.reply({
                content:
                    `Added ${role} to **${user.tag}**.`,
                ephemeral: true
            });
        }

        await member.roles.remove(role);

        await logAction(
            interaction.guild,
            "Role Removed",
            `Role: ${role}\nMember: ${user.tag}\nModerator: ${interaction.user}`
        );

        return interaction.reply({
            content:
                `Removed ${role} from **${user.tag}**.`,
            ephemeral: true
        });
    }

    /* ANNOUNCE */

    if (command === "announce") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const title =
            interaction.options.getString("title");

        const message =
            interaction.options.getString("message");

        const embed = createEmbed({
            title,
            description: message,
            footer: "Roblox Schools Association"
        });

        await interaction.channel.send({
            embeds: [embed]
        });

        await logAction(
            interaction.guild,
            "Announcement Sent",
            `Channel: ${interaction.channel}\nModerator: ${interaction.user}\nTitle: ${title}`
        );

        return interaction.reply({
            content:
                "Announcement sent.",
            ephemeral: true
        });
    }

    /* SET LOGS */

    if (command === "setlogs") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const channel =
            interaction.options.getChannel("channel");

        configs[interaction.guild.id] = {
            ...(configs[interaction.guild.id] || {}),
            logChannel: channel.id
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        return interaction.reply({
            content:
                `Moderation logs are now being sent to ${channel}.`,
            ephemeral: true
        });
    }

    /* LOGS */

    if (command === "logs") {

        const channel =
            configs[interaction.guild.id]?.logChannel;

        const embed = createEmbed({
            title: "Moderation Logs",
            description:
                channel
                    ? `Current log channel: <#${channel}>`
                    : "No log channel has been configured."
        });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* EMBED CREATOR */

    if (command === "embed") {

        if (!hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageMessages
        )) {
            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        embedSessions.set(
            interaction.user.id,
            {
                title: "RSA Announcement",
                description: "",
                footer: "Roblox Schools Association",
                image: "",
                thumbnail: "",
                fields: []
            }
        );

        return showEmbedBuilder(interaction);
    }
}

/* =========================================================
   EMBED CREATOR
========================================================= */

function buildCreatorEmbed(session) {

    return createEmbed({
        title:
            session.title ||
            "RSA Announcement",

        description:
            session.description ||
            "Use the buttons below to build your embed.",

        footer:
            session.footer ||
            "Roblox Schools Association",

        image:
            session.image || undefined,

        thumbnail:
            session.thumbnail || undefined,

        fields:
            session.fields.length
                ? session.fields
                : undefined
    });
}

async function showEmbedBuilder(interaction) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) return;

    const row1 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("embed_title")
                    .setLabel("Title")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("embed_description")
                    .setLabel("Description")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("embed_extra")
                    .setLabel("Images / Footer")
                    .setStyle(ButtonStyle.Secondary)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("embed_field")
                    .setLabel("Add Field")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("embed_preview")
                    .setLabel("Preview")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("embed_send")
                    .setLabel("Send")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("embed_cancel")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger)
            );

    const payload = {
        content:
            "### RSA Embed Creator\nCreate a professional RSA embed using the controls below.",
        embeds: [
            buildCreatorEmbed(session)
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    };

    if (
        interaction.replied ||
        interaction.deferred
    ) {
        return interaction.editReply(payload);
    }

    return interaction.reply(payload);
}

/* =========================================================
   BUTTONS
========================================================= */

async function handleButton(interaction) {

    if (!interaction.customId.startsWith("embed_")) {
        return;
    }

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return interaction.reply({
            content:
                "Your embed session has expired. Run `/embed` again.",
            ephemeral: true
        });
    }

    if (interaction.customId === "embed_title") {
        return showSingleModal(
            interaction,
            "modal_title",
            "Embed Title",
            "title",
            "Title",
            TextInputStyle.Short,
            session.title
        );
    }

    if (interaction.customId === "embed_description") {
        return showSingleModal(
            interaction,
            "modal_description",
            "Embed Description",
            "description",
            "Description",
            TextInputStyle.Paragraph,
            session.description
        );
    }

    if (interaction.customId === "embed_extra") {

        const modal =
            new ModalBuilder()
                .setCustomId("modal_extra")
                .setTitle("Images and Footer");

        const footer =
            new TextInputBuilder()
                .setCustomId("footer")
                .setLabel("Footer")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.footer || "");

        const image =
            new TextInputBuilder()
                .setCustomId("image")
                .setLabel("Image URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.image || "");

        const thumbnail =
            new TextInputBuilder()
                .setCustomId("thumbnail")
                .setLabel("Thumbnail URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(session.thumbnail || "");

        modal.addComponents(
            new ActionRowBuilder().addComponents(footer),
            new ActionRowBuilder().addComponents(image),
            new ActionRowBuilder().addComponents(thumbnail)
        );

        return interaction.showModal(modal);
    }

    if (interaction.customId === "embed_field") {

        const modal =
            new ModalBuilder()
                .setCustomId("modal_field")
                .setTitle("Add Embed Field");

        const name =
            new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Field Name")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(256);

        const value =
            new TextInputBuilder()
                .setCustomId("value")
                .setLabel("Field Value")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1024);

        modal.addComponents(
            new ActionRowBuilder().addComponents(name),
            new ActionRowBuilder().addComponents(value)
        );

        return interaction.showModal(modal);
    }

    if (interaction.customId === "embed_preview") {

        return interaction.reply({
            content: "Embed Preview",
            embeds: [
                buildCreatorEmbed(session)
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === "embed_send") {

        await interaction.channel.send({
            embeds: [
                buildCreatorEmbed(session)
            ]
        });

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content: "Embed sent successfully.",
            embeds: [],
            components: []
        });
    }

    if (interaction.customId === "embed_cancel") {

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content: "Embed creation cancelled.",
            embeds: [],
            components: []
        });
    }
}

/* =========================================================
   MODALS
========================================================= */

async function showSingleModal(
    interaction,
    customId,
    modalTitle,
    inputId,
    label,
    style,
    value
) {

    const modal =
        new ModalBuilder()
            .setCustomId(customId)
            .setTitle(modalTitle);

    const input =
        new TextInputBuilder()
            .setCustomId(inputId)
            .setLabel(label)
            .setStyle(style)
            .setRequired(false)
            .setMaxLength(
                style === TextInputStyle.Paragraph
                    ? 4000
                    : 256
            );

    if (value) {
        input.setValue(
            value.slice(
                0,
                style === TextInputStyle.Paragraph
                    ? 4000
                    : 256
            )
        );
    }

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(input)
    );

    return interaction.showModal(modal);
}

async function handleModal(interaction) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return interaction.reply({
            content:
                "Your embed session has expired.",
            ephemeral: true
        });
    }

    if (interaction.customId === "modal_title") {
        session.title =
            interaction.fields.getTextInputValue("title");
    }

    if (interaction.customId === "modal_description") {
        session.description =
            interaction.fields.getTextInputValue("description");
    }

    if (interaction.customId === "modal_extra") {

        session.footer =
            interaction.fields.getTextInputValue("footer");

        session.image =
            interaction.fields.getTextInputValue("image");

        session.thumbnail =
            interaction.fields.getTextInputValue("thumbnail");
    }

    if (interaction.customId === "modal_field") {

        if (session.fields.length >= 25) {
            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 embed fields.",
                ephemeral: true
            });
        }

        const name =
            interaction.fields.getTextInputValue("name");

        const value =
            interaction.fields.getTextInputValue("value");

        session.fields.push({
            name,
            value,
            inline: false
        });
    }

    await interaction.reply({
        content:
            "Updated. Your embed creator is still open.",
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
            "Member Joined",
            `Member: ${member.user.tag}\nID: ${member.id}`
        );
    }
);

client.on(
    "guildMemberRemove",
    async member => {

        await logAction(
            member.guild,
            "Member Left",
            `Member: ${member.user.tag}\nID: ${member.id}`
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
            "Message Deleted",
            `Author: ${message.author?.tag || "Unknown"}\n` +
            `Channel: ${message.channel}\n\n` +
            `${message.content?.slice(0, 1500) || "No text content."}`
        );
    }
);

client.on(
    "messageUpdate",
    async (oldMessage, newMessage) => {

        if (
            !oldMessage.guild ||
            oldMessage.author?.bot ||
            oldMessage.content === newMessage.content
        ) {
            return;
        }

        await logAction(
            oldMessage.guild,
            "Message Edited",
            `Author: ${oldMessage.author?.tag || "Unknown"}\n` +
            `Channel: ${oldMessage.channel}\n\n` +
            `Before:\n${oldMessage.content?.slice(0, 700) || "No content"}\n\n` +
            `After:\n${newMessage.content?.slice(0, 700) || "No content"}`
        );
    }
);

/* =========================================================
   ERROR HANDLING
========================================================= */

client.on("error", error => {
    console.error(
        "Discord client error:",
        error
    );
});

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
