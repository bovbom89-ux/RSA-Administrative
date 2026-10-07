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
    ChannelType,
    ActivityType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   RSA UTILITY
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const BOT_NAME = "RSA Utility";
const BOT_VERSION = "7.0.0";

const EMBED_COLOUR = "#2F4DA8";
const RSA_LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env");
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
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
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

function createEmbed({
    title = null,
    description = null,
    fields = [],
    footer = BOT_NAME,
    thumbnail = null,
    image = null,
    timestamp = true
} = {}) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOUR);

    if (title) {
        embed.setTitle(brandedTitle(title));
    }

    if (description) {
        embed.setDescription(description);
    }

    if (fields.length) {
        embed.addFields(fields);
    }

    if (thumbnail) {
        embed.setThumbnail(thumbnail);
    }

    if (image) {
        embed.setImage(image);
    }

    if (footer) {
        embed.setFooter({
            text: footer
        });
    }

    if (timestamp) {
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
        .setDescription("View RSA Utility commands."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View information about RSA Utility."),

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
                .setDescription("Reason for the ban.")
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
                .setDescription("Reason for the kick.")
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
                .setDescription("Reason for the timeout.")
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
                .setDescription("Reason for the warning.")
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
        .setDescription("Set channel slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode duration.")
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    /* ROLES */

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage member roles.")
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Add a role to a member.")
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
                .setDescription("Remove a role from a member.")
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

    /* ANNOUNCEMENTS */

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Send an RSA Utility announcement.")
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
        .setDescription("Create a custom RSA Utility embed."),

    /* ENROL */

    new SlashCommandBuilder()
        .setName("enrol")
        .setDescription("Enrol a member into the RSA."),

    /* TICKETS */

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Set up the RSA Utility ticket system.")
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription("Category where tickets are created.")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("panel")
                .setDescription("Channel for the ticket panel.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("support")
                .setDescription("Support role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("View the ticket configuration.")

].map(command => command.toJSON());

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    console.log("Registering RSA Utility commands...");

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        {
            body: commands
        }
    );

    console.log(`Successfully registered ${commands.length} commands.`);
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(interaction, permission) {
    return interaction.memberPermissions?.has(permission);
}

function isTicketStaff(interaction) {
    const ticket = configs[interaction.guild.id]?.ticket;

    if (!ticket?.supportRole) {
        return (
            hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            ) ||
            interaction.guild.ownerId === interaction.user.id
        );
    }

    return (
        interaction.member.roles.cache.has(ticket.supportRole) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        ) ||
        interaction.guild.ownerId === interaction.user.id
    );
}

function canModerate(interaction, member) {
    if (!member) return false;

    if (member.id === interaction.user.id) return false;

    if (member.id === interaction.guild.ownerId) return false;

    if (interaction.user.id !== interaction.guild.ownerId) {
        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return false;
        }
    }

    const botMember = interaction.guild.members.me;

    if (
        botMember &&
        member.roles.highest.position >=
            botMember.roles.highest.position
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
    console.log(
        `${BOT_NAME} is online as ${client.user.tag}`
    );

    client.user.setPresence({
        status: "online",
        activities: [
            {
                name: "RSA Utility",
                type: ActivityType.Watching
            }
        ]
    });

    try {
        await registerCommands();
    } catch (error) {
        console.error("Command registration failed:", error);
    }
});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on("interactionCreate", async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
            return;
        }

        if (interaction.isButton()) {
            await handleButton(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        }
    } catch (error) {
        console.error("Interaction error:", error);

        const response = {
            content: "Something went wrong while processing that action.",
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response).catch(() => {});
        } else {
            await interaction.reply(response).catch(() => {});
        }
    }
});

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(interaction) {
    const command = interaction.commandName;

    /* HELP */

    if (command === "help") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "RSA Utility",
                    description:
                        "A complete moderation, management and support utility.",
                    fields: [
                        {
                            name: "Information",
                            value:
                                "`/ping` `/botinfo` `/serverinfo` `/userinfo`"
                        },
                        {
                            name: "Moderation",
                            value:
                                "`/ban` `/kick` `/timeout` `/untimeout`\n`/warn` `/warnings` `/clearwarnings` `/purge`"
                        },
                        {
                            name: "Channels",
                            value:
                                "`/lock` `/unlock` `/slowmode`"
                        },
                        {
                            name: "Roles",
                            value:
                                "`/role add` `/role remove`"
                        },
                        {
                            name: "Utilities",
                            value:
                                "`/announce` `/embed` `/enrol`"
                        },
                        {
                            name: "Tickets",
                            value:
                                "`/ticketsetup` `/ticketconfig`"
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* PING */

    if (command === "ping") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Bot Status",
                    description:
                        `Pong! WebSocket latency: **${client.ws.ping}ms**`
                })
            ],
            ephemeral: true
        });
    }

    /* BOT INFO */

    if (command === "botinfo") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "RSA Utility",
                    description:
                        "RSA Utility provides moderation, management, enrolment and ticket tools.",
                    fields: [
                        {
                            name: "Version",
                            value: BOT_VERSION,
                            inline: true
                        },
                        {
                            name: "Servers",
                            value: `${client.guilds.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Commands",
                            value: `${commands.length}`,
                            inline: true
                        },
                        {
                            name: "Latency",
                            value: `${client.ws.ping}ms`,
                            inline: true
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* SERVER INFO */

    if (command === "serverinfo") {
        const guild = interaction.guild;

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Server Information",
                    thumbnail: guild.iconURL({ size: 256 }),
                    fields: [
                        {
                            name: "Server",
                            value: guild.name,
                            inline: true
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
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* USER INFO */

    if (command === "userinfo") {
        const user =
            interaction.options.getUser("user") ||
            interaction.user;

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        const roles = member
            ? member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 15)
                .join(" ") || "No roles"
            : "Not in server";

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "User Information",
                    thumbnail: user.displayAvatarURL({ size: 256 }),
                    fields: [
                        {
                            name: "User",
                            value: user.tag
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
                                member?.joinedTimestamp
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
                })
            ],
            ephemeral: true
        });
    }

    /* BAN */

    if (command === "ban") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.BanMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Ban Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member && !canModerate(interaction, member)) {
            return interaction.reply({
                content:
                    "You cannot ban this member because of the role hierarchy.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(user.id, { reason });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Banned",
                    description: `**${user.tag}** has been banned.`,
                    fields: [
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value: interaction.user.toString()
                        }
                    ]
                })
            ]
        });
    }

    /* KICK */

    if (command === "kick") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.KickMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Kick Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content: "You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Kicked",
                    description: `**${user.tag}** has been kicked.`,
                    fields: [
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value: interaction.user.toString()
                        }
                    ]
                })
            ]
        });
    }

    /* TIMEOUT */

    if (command === "timeout") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const minutes = interaction.options.getInteger("minutes");
        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content: "You cannot timeout this member.",
                ephemeral: true
            });
        }

        await member.timeout(minutes * 60 * 1000, reason);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Timed Out",
                    description: `**${user.tag}** has been timed out.`,
                    fields: [
                        {
                            name: "Duration",
                            value: `${minutes} minute(s)`
                        },
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value: interaction.user.toString()
                        }
                    ]
                })
            ]
        });
    }

    /* UNTIMEOUT */

    if (command === "untimeout") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content: "You cannot modify this member.",
                ephemeral: true
            });
        }

        await member.timeout(null, "Timeout removed.");

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Timeout Removed",
                    description:
                        `The timeout has been removed from **${user.tag}**.`
                })
            ]
        });
    }

    /* WARN */

    if (command === "warn") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(interaction, member)) {
            return interaction.reply({
                content: "You cannot warn this member.",
                ephemeral: true
            });
        }

        const key = `${interaction.guild.id}:${user.id}`;

        if (!warnings[key]) {
            warnings[key] = [];
        }

        warnings[key].push({
            reason,
            moderator: interaction.user.id,
            timestamp: Date.now()
        });

        saveJSON(WARNINGS_FILE, warnings);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Warned",
                    description:
                        `**${user.tag}** has been warned.`,
                    fields: [
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value: interaction.user.toString()
                        }
                    ]
                })
            ]
        });
    }

    /* WARNINGS */

    if (command === "warnings") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const key = `${interaction.guild.id}:${user.id}`;
        const list = warnings[key] || [];

        if (!list.length) {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: "Warnings",
                        description:
                            `**${user.tag}** has no warnings.`
                    })
                ],
                ephemeral: true
            });
        }

        const description = list
            .map(
                (item, index) =>
                    `**${index + 1}.** ${item.reason}\nModerator: <@${item.moderator}>\n<t:${Math.floor(
                        item.timestamp / 1000
                    )}:R>`
            )
            .join("\n\n");

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: `Warnings — ${user.tag}`,
                    description: description.slice(0, 4000)
                })
            ],
            ephemeral: true
        });
    }

    /* CLEAR WARNINGS */

    if (command === "clearwarnings") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const key = `${interaction.guild.id}:${user.id}`;

        delete warnings[key];
        saveJSON(WARNINGS_FILE, warnings);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Warnings Cleared",
                    description:
                        `All warnings for **${user.tag}** have been cleared.`
                })
            ]
        });
    }

    /* PURGE */

    if (command === "purge") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger("amount");

        const deleted =
            await interaction.channel.bulkDelete(amount, true);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Messages Purged",
                    description:
                        `Deleted **${deleted.size}** message(s).`
                })
            ],
            ephemeral: true
        });
    }

    /* LOCK */

    if (command === "lock") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: false
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Channel Locked",
                    description: "This channel has been locked."
                })
            ]
        });
    }

    /* UNLOCK */

    if (command === "unlock") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: null
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Channel Unlocked",
                    description: "This channel has been unlocked."
                })
            ]
        });
    }

    /* SLOWMODE */

    if (command === "slowmode") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        const seconds = interaction.options.getInteger("seconds");

        await interaction.channel.setRateLimitPerUser(seconds);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Slowmode Updated",
                    description:
                        seconds === 0
                            ? "Slowmode has been disabled."
                            : `Slowmode is now **${seconds} seconds**.`
                })
            ]
        });
    }

    /* ROLE */

    if (command === "role") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageRoles
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Roles permission.",
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        const member =
            await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: "Member not found.",
                ephemeral: true
            });
        }

        if (
            role.position >= interaction.member.roles.highest.position &&
            interaction.user.id !== interaction.guild.ownerId
        ) {
            return interaction.reply({
                content: "You cannot manage that role.",
                ephemeral: true
            });
        }

        const botMember = interaction.guild.members.me;

        if (
            botMember &&
            role.position >= botMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "My bot role is not high enough to manage that role.",
                ephemeral: true
            });
        }

        if (subcommand === "add") {
            await member.roles.add(role);

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: "Role Added",
                        description:
                            `Added ${role} to **${user.tag}**.`
                    })
                ]
            });
        }

        await member.roles.remove(role);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Role Removed",
                    description:
                        `Removed ${role} from **${user.tag}**.`
                })
            ]
        });
    }

    /* ANNOUNCE */

    if (command === "announce") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const title = interaction.options.getString("title");
        const message = interaction.options.getString("message");

        await interaction.channel.send({
            embeds: [
                createEmbed({
                    title,
                    description: message
                })
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Announcement Sent",
                    description: "The announcement has been sent."
                })
            ],
            ephemeral: true
        });
    }

    /* ENROL */

    if (command === "enrol") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageRoles
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Roles permission.",
                ephemeral: true
            });
        }

        const user = interaction.user;

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Enrolment",
                    description:
                        `${user}, your RSA enrolment request has been received.\n\nA member of the RSA team can review your enrolment shortly.`
                })
            ],
            ephemeral: true
        });
    }

    /* EMBED */

    if (command === "embed") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        embedSessions.set(interaction.user.id, {
            title: "RSA Utility Announcement",
            description: "",
            footer: "RSA Utility",
            image: "",
            thumbnail: "",
            fields: []
        });

        return showEmbedBuilder(interaction);
    }

    /* TICKET SETUP */

    if (command === "ticketsetup") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const category =
            interaction.options.getChannel("category");

        const panel =
            interaction.options.getChannel("panel");

        const support =
            interaction.options.getRole("support");

        configs[interaction.guild.id] = {
            ...(configs[interaction.guild.id] || {}),
            ticket: {
                category: category.id,
                panelChannel: panel.id,
                supportRole: support.id
            }
        };

        saveJSON(CONFIG_FILE, configs);

        const panelEmbed = createEmbed({
            title: "RSA Support",
            description:
                "Need assistance? Click the button below to open a private support ticket.\n\nA member of the support team will assist you as soon as possible."
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_create")
                    .setLabel("Create Ticket")
                    .setStyle(ButtonStyle.Primary)
            );

        await panel.send({
            embeds: [panelEmbed],
            components: [row]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Ticket System Configured",
                    description:
                        "The RSA Utility ticket system has been configured successfully.",
                    fields: [
                        {
                            name: "Category",
                            value: category.toString()
                        },
                        {
                            name: "Panel",
                            value: panel.toString()
                        },
                        {
                            name: "Support Role",
                            value: support.toString()
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* TICKET CONFIG */

    if (command === "ticketconfig") {
        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {
            return interaction.reply({
                content: "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const ticket = configs[interaction.guild.id]?.ticket;

        if (!ticket) {
            return interaction.reply({
                content:
                    "The ticket system has not been configured yet.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Ticket Configuration",
                    fields: [
                        {
                            name: "Category",
                            value: `<#${ticket.category}>`
                        },
                        {
                            name: "Panel",
                            value: `<#${ticket.panelChannel}>`
                        },
                        {
                            name: "Support Role",
                            value: `<@&${ticket.supportRole}>`
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   EMBED CREATOR
========================================================= */

function buildCreatorEmbed(session) {
    return createEmbed({
        title: session.title || "RSA Utility Announcement",
        description:
            session.description ||
            "Use the controls below to build your embed.",
        footer: session.footer || "RSA Utility",
        image: session.image || undefined,
        thumbnail: session.thumbnail || undefined,
        fields: session.fields.length
            ? session.fields
            : undefined
    });
}

async function showEmbedBuilder(interaction) {
    const session = embedSessions.get(interaction.user.id);

    if (!session) return;

    const row1 = new ActionRowBuilder()
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

    const row2 = new ActionRowBuilder()
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
            "### RSA Utility Embed Creator\nBuild your embed using the controls below.",
        embeds: [buildCreatorEmbed(session)],
        components: [row1, row2],
        ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
        return interaction.editReply(payload);
    }

    return interaction.reply(payload);
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(interaction) {

    /* CREATE TICKET */

    if (interaction.customId === "ticket_create") {
        const config = configs[interaction.guild.id]?.ticket;

        if (!config) {
            return interaction.reply({
                content:
                    "The ticket system has not been configured.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const existing =
            interaction.guild.channels.cache.find(
                channel =>
                    channel.type === ChannelType.GuildText &&
                    channel.topic ===
                        `ticket-owner:${interaction.user.id}`
            );

        if (existing) {
            return interaction.editReply({
                content:
                    `You already have an open ticket: ${existing}`
            });
        }

        const category =
            interaction.guild.channels.cache.get(config.category);

        const supportRole =
            interaction.guild.roles.cache.get(config.supportRole);

        if (!category || category.type !== ChannelType.GuildCategory) {
            return interaction.editReply({
                content:
                    "The configured ticket category no longer exists."
            });
        }

        if (!supportRole) {
            return interaction.editReply({
                content:
                    "The configured support role no longer exists."
            });
        }

        const safeName =
            interaction.user.username
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 20) || "user";

        const channel =
            await interaction.guild.channels.create({
                name: `ticket-${safeName}`,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: `ticket-owner:${interaction.user.id}`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id: supportRole.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                    }
                ]
            });

        const ticketEmbed = createEmbed({
            title: "Support Ticket",
            description:
                `Welcome ${interaction.user}.\n\nPlease explain your enquiry clearly and provide any relevant information. A member of the support team will assist you shortly.`,
            fields: [
                {
                    name: "Ticket Owner",
                    value: interaction.user.toString()
                },
                {
                    name: "Status",
                    value: "Unclaimed"
                }
            ]
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("ticket_claim")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("ticket_modpanel")
                    .setLabel("Mod Panel")
                    .setStyle(ButtonStyle.Secondary)
            );

        await channel.send({
            content: `${interaction.user} <@&${supportRole.id}>`,
            embeds: [ticketEmbed],
            components: [buttons]
        });

        return interaction.editReply({
            content:
                `Your ticket has been created: ${channel}`
        });
    }

    /* CLAIM */

    if (interaction.customId === "ticket_claim") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to claim tickets.",
                ephemeral: true
            });
        }

        const ownerId = getTicketOwner(interaction.channel);

        return interaction.update({
            embeds: [
                createEmbed({
                    title: "Support Ticket",
                    description:
                        ownerId
                            ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information.`
                            : "Support ticket.",
                    fields: [
                        {
                            name: "Ticket Owner",
                            value: ownerId
                                ? `<@${ownerId}>`
                                : "Unknown"
                        },
                        {
                            name: "Status",
                            value:
                                `Claimed by ${interaction.user}`
                        }
                    ]
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("ticket_unclaim")
                            .setLabel("Unclaim")
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId("ticket_close")
                            .setLabel("Close")
                            .setStyle(ButtonStyle.Danger),

                        new ButtonBuilder()
                            .setCustomId("ticket_modpanel")
                            .setLabel("Mod Panel")
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }

    /* UNCLAIM */

    if (interaction.customId === "ticket_unclaim") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to unclaim tickets.",
                ephemeral: true
            });
        }

        const ownerId = getTicketOwner(interaction.channel);

        return interaction.update({
            embeds: [
                createEmbed({
                    title: "Support Ticket",
                    description:
                        ownerId
                            ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information.`
                            : "Support ticket.",
                    fields: [
                        {
                            name: "Ticket Owner",
                            value: ownerId
                                ? `<@${ownerId}>`
                                : "Unknown"
                        },
                        {
                            name: "Status",
                            value: "Unclaimed"
                        }
                    ]
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("ticket_claim")
                            .setLabel("Claim")
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId("ticket_close")
                            .setLabel("Close")
                            .setStyle(ButtonStyle.Danger),

                        new ButtonBuilder()
                            .setCustomId("ticket_modpanel")
                            .setLabel("Mod Panel")
                            .setStyle(ButtonStyle.Secondary)
                    )
            ]
        });
    }

    /* CLOSE */

    if (interaction.customId === "ticket_close") {
        const ownerId = getTicketOwner(interaction.channel);

        if (
            !isTicketStaff(interaction) &&
            ownerId !== interaction.user.id
        ) {
            return interaction.reply({
                content:
                    "You do not have permission to close this ticket.",
                ephemeral: true
            });
        }

        return closeTicket(interaction);
    }

    /* MOD PANEL */

    if (interaction.customId === "ticket_modpanel") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to use the moderator panel.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Ticket Moderator Panel",
                    description:
                        "Use the controls below to manage this ticket."
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("ticket_rename")
                            .setLabel("Rename")
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId("ticket_unclaim")
                            .setLabel("Unclaim")
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId("ticket_adduser")
                            .setLabel("Add User")
                            .setStyle(ButtonStyle.Secondary),

                        new ButtonBuilder()
                            .setCustomId("ticket_removeuser")
                            .setLabel("Remove User")
                            .setStyle(ButtonStyle.Secondary)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("ticket_close")
                            .setLabel("Close Ticket")
                            .setStyle(ButtonStyle.Danger)
                    )
            ],
            ephemeral: true
        });
    }

    /* TICKET RENAME */

    if (interaction.customId === "ticket_rename") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("modal_ticket_rename")
            .setTitle("Rename Ticket");

        const input = new TextInputBuilder()
            .setCustomId("ticket_name")
            .setLabel("New Ticket Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(90)
            .setValue(interaction.channel.name);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
    }

    /* ADD USER */

    if (interaction.customId === "ticket_adduser") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("modal_ticket_adduser")
            .setTitle("Add User");

        const input = new TextInputBuilder()
            .setCustomId("user_id")
            .setLabel("Discord User ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
    }

    /* REMOVE USER */

    if (interaction.customId === "ticket_removeuser") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("modal_ticket_removeuser")
            .setTitle("Remove User");

        const input = new TextInputBuilder()
            .setCustomId("user_id")
            .setLabel("Discord User ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
    }

    /* EMBED BUTTONS */

    if (!interaction.customId.startsWith("embed_")) {
        return;
    }

    const session = embedSessions.get(interaction.user.id);

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
        const modal = new ModalBuilder()
            .setCustomId("modal_extra")
            .setTitle("Images and Footer");

        const footer = new TextInputBuilder()
            .setCustomId("footer")
            .setLabel("Footer")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(session.footer || "");

        const image = new TextInputBuilder()
            .setCustomId("image")
            .setLabel("Image URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(session.image || "");

        const thumbnail = new TextInputBuilder()
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
        if (session.fields.length >= 25) {
            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 embed fields.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("modal_field")
            .setTitle("Add Embed Field");

        const name = new TextInputBuilder()
            .setCustomId("name")
            .setLabel("Field Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(256);

        const value = new TextInputBuilder()
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
            embeds: [buildCreatorEmbed(session)],
            ephemeral: true
        });
    }

    if (interaction.customId === "embed_send") {
        await interaction.channel.send({
            embeds: [buildCreatorEmbed(session)]
        });

        embedSessions.delete(interaction.user.id);

        return interaction.update({
            content: "Embed sent successfully.",
            embeds: [],
            components: []
        });
    }

    if (interaction.customId === "embed_cancel") {
        embedSessions.delete(interaction.user.id);

        return interaction.update({
            content: "Embed creation cancelled.",
            embeds: [],
            components: []
        });
    }
}

/* =========================================================
   TICKET OWNER
========================================================= */

function getTicketOwner(channel) {
    if (!channel?.topic) return null;

    const match =
        channel.topic.match(/ticket-owner:(\d+)/);

    return match ? match[1] : null;
}

/* =========================================================
   CLOSE TICKET
========================================================= */

async function closeTicket(interaction) {
    const channel = interaction.channel;
    const ownerId = getTicketOwner(channel);

    await interaction.reply({
        embeds: [
            createEmbed({
                title: "Ticket Closing",
                description:
                    "This ticket is being closed."
            })
        ]
    });

    setTimeout(async () => {
        await channel.delete(
            `Ticket closed by ${interaction.user.tag}`
        ).catch(() => {});
    }, 1500);
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
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(modalTitle);

    const maxLength =
        style === TextInputStyle.Paragraph
            ? 4000
            : 256;

    const input = new TextInputBuilder()
        .setCustomId(inputId)
        .setLabel(label)
        .setStyle(style)
        .setRequired(false)
        .setMaxLength(maxLength);

    if (value) {
        input.setValue(value.slice(0, maxLength));
    }

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(interaction) {

    /* RENAME */

    if (interaction.customId === "modal_ticket_rename") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        let name =
            interaction.fields
                .getTextInputValue("ticket_name")
                .toLowerCase()
                .replace(/[^a-z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 90);

        if (!name) {
            name = "ticket";
        }

        await interaction.channel.setName(name);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Ticket Renamed",
                    description:
                        `The ticket has been renamed to **${name}**.`
                })
            ],
            ephemeral: true
        });
    }

    /* ADD USER */

    if (interaction.customId === "modal_ticket_adduser") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields
                .getTextInputValue("user_id")
                .trim();

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content:
                    "I could not find that member in this server.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            member.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "User Added",
                    description:
                        `${member} has been added to this ticket.`
                })
            ],
            ephemeral: true
        });
    }

    /* REMOVE USER */

    if (interaction.customId === "modal_ticket_removeuser") {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields
                .getTextInputValue("user_id")
                .trim();

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content:
                    "I could not find that member.",
                ephemeral: true
            });
        }

        const ownerId = getTicketOwner(interaction.channel);

        if (ownerId === member.id) {
            return interaction.reply({
                content:
                    "The ticket owner cannot be removed from their own ticket.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites
            .delete(member.id)
            .catch(() => {});

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "User Removed",
                    description:
                        `${member} has been removed from this ticket.`
                })
            ],
            ephemeral: true
        });
    }

    /* EMBED MODALS */

    const session = embedSessions.get(interaction.user.id);

    if (!session) {
        return interaction.reply({
            content:
                "Your embed session has expired. Run `/embed` again.",
            ephemeral: true
        });
    }

    if (interaction.customId === "modal_title") {
        session.title =
            interaction.fields.getTextInputValue("title");
    }

    else if (interaction.customId === "modal_description") {
        session.description =
            interaction.fields.getTextInputValue("description");
    }

    else if (interaction.customId === "modal_extra") {
        session.footer =
            interaction.fields.getTextInputValue("footer");

        session.image =
            interaction.fields.getTextInputValue("image");

        session.thumbnail =
            interaction.fields.getTextInputValue("thumbnail");
    }

    else if (interaction.customId === "modal_field") {
        if (session.fields.length >= 25) {
            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 fields.",
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

    else {
        return;
    }

    return interaction.reply({
        embeds: [
            createEmbed({
                title: "Embed Updated",
                description:
                    "Your embed has been updated."
            })
        ],
        ephemeral: true
    });
}

/* =========================================================
   ERRORS
========================================================= */

client.on("error", error => {
    console.error("Discord client error:", error);
});

process.on("unhandledRejection", error => {
    console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught exception:", error);
});

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);
