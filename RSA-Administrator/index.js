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

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const LOGO = "<:Our_Logo:1557149633623363594>";
const COLOUR = "#2F4DA8";
const VERSION = "6.0.0";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID.");
    process.exit(1);
}

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

const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const WARNINGS_FILE = path.join(DATA_DIR, "warnings.json");
const ENROL_FILE = path.join(DATA_DIR, "enrolments.json");

function load(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return fallback;
    }
}

function save(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const configs = load(CONFIG_FILE, {});
const warnings = load(WARNINGS_FILE, {});
const enrolments = load(ENROL_FILE, {});

const embedSessions = new Map();

/* =========================================================
   EMBEDS
========================================================= */

function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(COLOUR)
        .setTimestamp();

    if (options.title) {
        embed.setTitle(`${LOGO} ${options.title}`);
    }

    if (options.description) {
        embed.setDescription(options.description);
    }

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    if (options.footer) {
        embed.setFooter({ text: options.footer });
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
        .setDescription("Check the bot latency."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View bot information."),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View server information."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View information about a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member to inspect.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View an RSA member profile.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member to view.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Duration in minutes.")
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a timeout.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Amount.")
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
        .addIntegerOption(o =>
            o.setName("seconds")
                .setDescription("Seconds.")
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage member roles.")
        .addSubcommand(s =>
            s.setName("add")
                .setDescription("Add a role.")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Member.")
                        .setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role")
                        .setDescription("Role.")
                        .setRequired(true)
                )
        )
        .addSubcommand(s =>
            s.setName("remove")
                .setDescription("Remove a role.")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Member.")
                        .setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role")
                        .setDescription("Role.")
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Send an RSA announcement.")
        .addStringOption(o =>
            o.setName("title")
                .setDescription("Title.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("message")
                .setDescription("Message.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Open the embed creator."),

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription("Configure the ticket system.")
        .addChannelOption(o =>
            o.setName("category")
                .setDescription("Ticket category.")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .addChannelOption(o =>
            o.setName("panel")
                .setDescription("Ticket panel channel.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addChannelOption(o =>
            o.setName("logs")
                .setDescription("Ticket logs channel.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addRoleOption(o =>
            o.setName("support")
                .setDescription("Support role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("View ticket configuration."),

    new SlashCommandBuilder()
        .setName("enrol")
        .setDescription("Submit an RSA enrolment application."),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription("Configure RSA enrolment.")
        .addChannelOption(o =>
            o.setName("channel")
                .setDescription("Application review channel.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addRoleOption(o =>
            o.setName("role")
                .setDescription("Role given when approved.")
                .setRequired(true)
        )
].map(c => c.toJSON());

/* =========================================================
   REGISTRATION
========================================================= */

async function registerCommands() {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log(`Successfully registered ${commands.length} commands.`);
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(interaction, permission) {
    return interaction.memberPermissions?.has(permission);
}

function ticketStaff(interaction) {
    const ticket = configs[interaction.guild.id]?.ticket;

    if (!ticket) {
        return hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
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

    if (
        interaction.guild.ownerId !== interaction.user.id &&
        member.roles.highest.position >=
        interaction.member.roles.highest.position
    ) {
        return false;
    }

    if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

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
        console.error("Command registration failed:", error);
    }
});

/* =========================================================
   COMMAND HANDLER
========================================================= */

client.on("interactionCreate", async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await commandHandler(interaction);
        } else if (interaction.isButton()) {
            await buttonHandler(interaction);
        } else if (interaction.isModalSubmit()) {
            await modalHandler(interaction);
        }
    } catch (error) {
        console.error("Interaction error:", error);

        const response = {
            content: "An unexpected error occurred.",
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response).catch(() => {});
        } else {
            await interaction.reply(response).catch(() => {});
        }
    }
});

async function commandHandler(i) {
    const c = i.commandName;

    /* HELP */

    if (c === "help") {
        return i.reply({
            embeds: [
                createEmbed({
                    title: "RSA Administrator",
                    description:
                        "Administration, moderation, ticketing and enrolment tools for the Roblox Schools Association.",
                    fields: [
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
                            name: "Tickets",
                            value:
                                "`/ticketsetup` `/ticketconfig`"
                        },
                        {
                            name: "Enrolment",
                            value:
                                "`/enrol` `/enrolconfig`"
                        },
                        {
                            name: "Information",
                            value:
                                "`/help` `/ping` `/botinfo` `/serverinfo` `/userinfo` `/profile`"
                        },
                        {
                            name: "Tools",
                            value: "`/embed`"
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* PING */

    if (c === "ping") {
        return i.reply({
            embeds: [
                createEmbed({
                    title: "Bot Status",
                    description: `Latency: **${client.ws.ping}ms**`
                })
            ],
            ephemeral: true
        });
    }

    /* BOT INFO */

    if (c === "botinfo") {
        return i.reply({
            embeds: [
                createEmbed({
                    title: "RSA Administrator",
                    description:
                        "Administration bot for the Roblox Schools Association.",
                    fields: [
                        {
                            name: "Version",
                            value: VERSION,
                            inline: true
                        },
                        {
                            name: "Servers",
                            value: `${client.guilds.cache.size}`,
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

    if (c === "serverinfo") {
        const g = i.guild;

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Server Information",
                    thumbnail: g.iconURL({ size: 256 }),
                    fields: [
                        {
                            name: "Server",
                            value: g.name
                        },
                        {
                            name: "Members",
                            value: `${g.memberCount}`,
                            inline: true
                        },
                        {
                            name: "Channels",
                            value: `${g.channels.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Roles",
                            value: `${g.roles.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Owner",
                            value: `<@${g.ownerId}>`
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* USER INFO */

    if (c === "userinfo") {
        const user =
            i.options.getUser("user") || i.user;

        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        return i.reply({
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
                            name: "ID",
                            value: user.id
                        },
                        {
                            name: "Account Created",
                            value:
                                `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`
                        },
                        {
                            name: "Joined Server",
                            value:
                                member?.joinedTimestamp
                                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                                    : "Unknown"
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* PROFILE */

    if (c === "profile") {
        const user =
            i.options.getUser("user") || i.user;

        const application =
            enrolments[`${i.guild.id}:${user.id}`];

        return i.reply({
            embeds: [
                createEmbed({
                    title: "RSA Profile",
                    thumbnail: user.displayAvatarURL({ size: 256 }),
                    fields: [
                        {
                            name: "Member",
                            value: `${user}`
                        },
                        {
                            name: "Username",
                            value: user.username
                        },
                        {
                            name: "Enrolment Status",
                            value:
                                application?.status ||
                                "Not enrolled"
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* BAN */

    if (c === "ban") {
        if (!hasPermission(i, PermissionsBitField.Flags.BanMembers)) {
            return i.reply({
                content: "You need the Ban Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        const reason =
            i.options.getString("reason") ||
            "No reason provided.";

        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        if (member && !canModerate(i, member)) {
            return i.reply({
                content: "You cannot moderate that member.",
                ephemeral: true
            });
        }

        await i.guild.members.ban(user.id, { reason });

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Member Banned",
                    description:
                        `${user} has been banned.\n\n**Reason:** ${reason}`
                })
            ]
        });
    }

    /* KICK */

    if (c === "kick") {
        if (!hasPermission(i, PermissionsBitField.Flags.KickMembers)) {
            return i.reply({
                content: "You need the Kick Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        const reason =
            i.options.getString("reason") ||
            "No reason provided.";

        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(i, member)) {
            return i.reply({
                content: "You cannot kick that member.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Member Kicked",
                    description:
                        `${user} has been kicked.\n\n**Reason:** ${reason}`
                })
            ]
        });
    }

    /* TIMEOUT */

    if (c === "timeout") {
        if (!hasPermission(i, PermissionsBitField.Flags.ModerateMembers)) {
            return i.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        const minutes = i.options.getInteger("minutes");
        const reason =
            i.options.getString("reason") ||
            "No reason provided.";

        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(i, member)) {
            return i.reply({
                content: "You cannot timeout that member.",
                ephemeral: true
            });
        }

        await member.timeout(minutes * 60000, reason);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Member Timed Out",
                    description:
                        `${user} has been timed out for **${minutes} minutes**.\n\n**Reason:** ${reason}`
                })
            ]
        });
    }

    /* UNTIMEOUT */

    if (c === "untimeout") {
        if (!hasPermission(i, PermissionsBitField.Flags.ModerateMembers)) {
            return i.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(i, member)) {
            return i.reply({
                content: "You cannot modify that member.",
                ephemeral: true
            });
        }

        await member.timeout(null);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Timeout Removed",
                    description: `The timeout has been removed from ${user}.`
                })
            ]
        });
    }

    /* WARN */

    if (c === "warn") {
        if (!hasPermission(i, PermissionsBitField.Flags.ModerateMembers)) {
            return i.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        const reason = i.options.getString("reason");

        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        if (!member || !canModerate(i, member)) {
            return i.reply({
                content: "You cannot warn that member.",
                ephemeral: true
            });
        }

        const key = `${i.guild.id}:${user.id}`;

        if (!warnings[key]) warnings[key] = [];

        warnings[key].push({
            reason,
            moderator: i.user.id,
            timestamp: Date.now()
        });

        save(WARNINGS_FILE, warnings);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Member Warned",
                    description:
                        `${user} has been warned.\n\n**Reason:** ${reason}`
                })
            ]
        });
    }

    /* WARNINGS */

    if (c === "warnings") {
        if (!hasPermission(i, PermissionsBitField.Flags.ModerateMembers)) {
            return i.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        const list =
            warnings[`${i.guild.id}:${user.id}`] || [];

        const description =
            list.length
                ? list.map(
                    (w, n) =>
                        `**${n + 1}.** ${w.reason}\nModerator: <@${w.moderator}>\n<t:${Math.floor(w.timestamp / 1000)}:R>`
                ).join("\n\n")
                : `${user} has no warnings.`;

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Warnings",
                    description
                })
            ],
            ephemeral: true
        });
    }

    /* CLEAR WARNINGS */

    if (c === "clearwarnings") {
        if (!hasPermission(i, PermissionsBitField.Flags.ModerateMembers)) {
            return i.reply({
                content: "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user = i.options.getUser("user");
        delete warnings[`${i.guild.id}:${user.id}`];
        save(WARNINGS_FILE, warnings);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Warnings Cleared",
                    description:
                        `All warnings for ${user} have been cleared.`
                })
            ]
        });
    }

    /* PURGE */

    if (c === "purge") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageMessages)) {
            return i.reply({
                content: "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const amount = i.options.getInteger("amount");
        const deleted =
            await i.channel.bulkDelete(amount, true);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Messages Purged",
                    description:
                        `Deleted **${deleted.size}** messages.`
                })
            ],
            ephemeral: true
        });
    }

    /* LOCK */

    if (c === "lock") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageChannels)) {
            return i.reply({
                content: "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await i.channel.permissionOverwrites.edit(
            i.guild.roles.everyone,
            { SendMessages: false }
        );

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Channel Locked",
                    description: `${i.channel} has been locked.`
                })
            ]
        });
    }

    /* UNLOCK */

    if (c === "unlock") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageChannels)) {
            return i.reply({
                content: "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await i.channel.permissionOverwrites.edit(
            i.guild.roles.everyone,
            { SendMessages: null }
        );

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Channel Unlocked",
                    description: `${i.channel} has been unlocked.`
                })
            ]
        });
    }

    /* SLOWMODE */

    if (c === "slowmode") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageChannels)) {
            return i.reply({
                content: "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        const seconds = i.options.getInteger("seconds");

        await i.channel.setRateLimitPerUser(seconds);

        return i.reply({
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

    if (c === "role") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageRoles)) {
            return i.reply({
                content: "You need the Manage Roles permission.",
                ephemeral: true
            });
        }

        const sub = i.options.getSubcommand();
        const user = i.options.getUser("user");
        const role = i.options.getRole("role");

        if (
            role.position >=
            i.guild.members.me.roles.highest.position
        ) {
            return i.reply({
                content: "My role is not high enough to manage that role.",
                ephemeral: true
            });
        }

        const member =
            await i.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return i.reply({
                content: "Member not found.",
                ephemeral: true
            });
        }

        if (sub === "add") {
            await member.roles.add(role);
        } else {
            await member.roles.remove(role);
        }

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Role Updated",
                    description:
                        `${role} was ${sub === "add" ? "added to" : "removed from"} ${user}.`
                })
            ]
        });
    }

    /* ANNOUNCE */

    if (c === "announce") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageMessages)) {
            return i.reply({
                content: "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const title = i.options.getString("title");
        const message = i.options.getString("message");

        await i.channel.send({
            embeds: [
                createEmbed({
                    title,
                    description: message,
                    footer: "Roblox Schools Association"
                })
            ]
        });

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Announcement Sent",
                    description: "The announcement has been sent."
                })
            ],
            ephemeral: true
        });
    }

    /* TICKET SETUP */

    if (c === "ticketsetup") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageGuild)) {
            return i.reply({
                content: "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const category = i.options.getChannel("category");
        const panel = i.options.getChannel("panel");
        const logs = i.options.getChannel("logs");
        const support = i.options.getRole("support");

        configs[i.guild.id] ??= {};

        configs[i.guild.id].ticket = {
            category: category.id,
            panel: panel.id,
            logs: logs.id,
            support: support.id
        };

        save(CONFIG_FILE, configs);

        await panel.send({
            embeds: [
                createEmbed({
                    title: "RSA Support",
                    description:
                        "Need assistance? Click the button below to create a private support ticket.",
                    footer: "Roblox Schools Association"
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_create")
                        .setLabel("Create Ticket")
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Ticket System Configured",
                    description:
                        `**Category:** ${category}\n**Panel:** ${panel}\n**Logs:** ${logs}\n**Support:** ${support}`
                })
            ],
            ephemeral: true
        });
    }

    /* TICKET CONFIG */

    if (c === "ticketconfig") {
        const t = configs[i.guild.id]?.ticket;

        if (!t) {
            return i.reply({
                content: "The ticket system has not been configured.",
                ephemeral: true
            });
        }

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Ticket Configuration",
                    fields: [
                        {
                            name: "Category",
                            value: `<#${t.category}>`
                        },
                        {
                            name: "Panel",
                            value: `<#${t.panel}>`
                        },
                        {
                            name: "Logs",
                            value: `<#${t.logs}>`
                        },
                        {
                            name: "Support",
                            value: `<@&${t.support}>`
                        }
                    ]
                })
            ],
            ephemeral: true
        });
    }

    /* ENROL CONFIG */

    if (c === "enrolconfig") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageGuild)) {
            return i.reply({
                content: "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const channel = i.options.getChannel("channel");
        const role = i.options.getRole("role");

        configs[i.guild.id] ??= {};

        configs[i.guild.id].enrol = {
            channel: channel.id,
            role: role.id
        };

        save(CONFIG_FILE, configs);

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Enrolment Configured",
                    description:
                        `Applications will be sent to ${channel}.\nApproved applicants will receive ${role}.`
                })
            ],
            ephemeral: true
        });
    }

    /* ENROL */

    if (c === "enrol") {
        const config = configs[i.guild.id]?.enrol;

        if (!config) {
            return i.reply({
                content:
                    "The enrolment system has not been configured yet.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("enrol_modal")
            .setTitle("RSA Enrolment");

        const roblox = new TextInputBuilder()
            .setCustomId("roblox")
            .setLabel("Roblox Username")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);

        const reason = new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Why do you want to join RSA?")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        const organisation = new TextInputBuilder()
            .setCustomId("organisation")
            .setLabel("School / Organisation")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100);

        const position = new TextInputBuilder()
            .setCustomId("position")
            .setLabel("Position / Role")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100);

        modal.addComponents(
            new ActionRowBuilder().addComponents(roblox),
            new ActionRowBuilder().addComponents(reason),
            new ActionRowBuilder().addComponents(organisation),
            new ActionRowBuilder().addComponents(position)
        );

        return i.showModal(modal);
    }

    /* EMBED */

    if (c === "embed") {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageMessages)) {
            return i.reply({
                content: "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        embedSessions.set(i.user.id, {
            title: "RSA Announcement",
            description: "",
            footer: "Roblox Schools Association"
        });

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Embed Creator",
                    description:
                        "Use the buttons below to create an embed."
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("embed_title")
                        .setLabel("Title")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("embed_description")
                        .setLabel("Description")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("embed_send")
                        .setLabel("Send")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("embed_cancel")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Danger)
                )
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   BUTTONS
========================================================= */

async function buttonHandler(i) {

    /* CREATE TICKET */

    if (i.customId === "ticket_create") {
        const t = configs[i.guild.id]?.ticket;

        if (!t) {
            return i.reply({
                content: "Tickets are not configured.",
                ephemeral: true
            });
        }

        const existing = i.guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildText &&
                c.topic === `ticket-owner:${i.user.id}`
        );

        if (existing) {
            return i.reply({
                content: `You already have a ticket: ${existing}`,
                ephemeral: true
            });
        }

        await i.deferReply({ ephemeral: true });

        const channel = await i.guild.channels.create({
            name: `ticket-${i.user.username}`
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-")
                .slice(0, 25),
            type: ChannelType.GuildText,
            parent: t.category,
            topic: `ticket-owner:${i.user.id}`,
            permissionOverwrites: [
                {
                    id: i.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: i.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: t.support,
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

        await channel.send({
            content: `${i.user} <@&${t.support}>`,
            embeds: [
                createEmbed({
                    title: "Support Ticket",
                    description:
                        `Welcome ${i.user}.\n\nPlease explain your enquiry clearly. A member of the support team will assist you shortly.`,
                    fields: [
                        {
                            name: "Ticket Owner",
                            value: `${i.user}`
                        },
                        {
                            name: "Status",
                            value: "Unclaimed"
                        }
                    ]
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_claim")
                        .setLabel("Claim")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("ticket_close")
                        .setLabel("Close")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("ticket_mod")
                        .setLabel("Mod Panel")
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });

        return i.editReply({
            content: `Your ticket has been created: ${channel}`
        });
    }

    /* CLAIM */

    if (i.customId === "ticket_claim") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot claim tickets.",
                ephemeral: true
            });
        }

        return i.update({
            embeds: [
                createEmbed({
                    title: "Support Ticket",
                    description:
                        `This ticket has been claimed by ${i.user}.`,
                    fields: [
                        {
                            name: "Status",
                            value: `Claimed by ${i.user}`
                        }
                    ]
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_unclaim")
                        .setLabel("Unclaim")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("ticket_close")
                        .setLabel("Close")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("ticket_mod")
                        .setLabel("Mod Panel")
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    }

    /* UNCLAIM */

    if (i.customId === "ticket_unclaim") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot unclaim tickets.",
                ephemeral: true
            });
        }

        return i.update({
            embeds: [
                createEmbed({
                    title: "Support Ticket",
                    description: "This ticket is currently unclaimed.",
                    fields: [
                        {
                            name: "Status",
                            value: "Unclaimed"
                        }
                    ]
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_claim")
                        .setLabel("Claim")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("ticket_close")
                        .setLabel("Close")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("ticket_mod")
                        .setLabel("Mod Panel")
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    }

    /* CLOSE */

    if (i.customId === "ticket_close") {
        const owner = i.channel.topic?.match(
            /ticket-owner:(\d+)/
        )?.[1];

        if (
            !ticketStaff(i) &&
            owner !== i.user.id
        ) {
            return i.reply({
                content: "You cannot close this ticket.",
                ephemeral: true
            });
        }

        await i.reply({
            embeds: [
                createEmbed({
                    title: "Ticket Closing",
                    description:
                        "This ticket will be deleted in a few seconds."
                })
            ]
        });

        setTimeout(
            () => i.channel.delete().catch(() => {}),
            3000
        );

        return;
    }

    /* MOD PANEL */

    if (i.customId === "ticket_mod") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot use the moderator panel.",
                ephemeral: true
            });
        }

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Ticket Moderator Panel",
                    description:
                        "Use the controls below to manage this ticket."
                })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_rename")
                        .setLabel("Rename")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("ticket_unclaim")
                        .setLabel("Unclaim")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("ticket_add")
                        .setLabel("Add User")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("ticket_remove")
                        .setLabel("Remove User")
                        .setStyle(ButtonStyle.Secondary)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket_close")
                        .setLabel("Close Ticket")
                        .setStyle(ButtonStyle.Danger)
                )
            ],
            ephemeral: true
        });
    }

    /* RENAME */

    if (i.customId === "ticket_rename") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot rename tickets.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("rename_modal")
            .setTitle("Rename Ticket");

        const input = new TextInputBuilder()
            .setCustomId("name")
            .setLabel("New ticket name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(90);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return i.showModal(modal);
    }

    /* ADD USER */

    if (i.customId === "ticket_add") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot manage ticket users.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("add_user_modal")
            .setTitle("Add User");

        const input = new TextInputBuilder()
            .setCustomId("id")
            .setLabel("Discord User ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return i.showModal(modal);
    }

    /* REMOVE USER */

    if (i.customId === "ticket_remove") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot manage ticket users.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("remove_user_modal")
            .setTitle("Remove User");

        const input = new TextInputBuilder()
            .setCustomId("id")
            .setLabel("Discord User ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return i.showModal(modal);
    }

    /* ENROL APPROVE */

    if (i.customId.startsWith("enrol_approve_")) {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageGuild)) {
            return i.reply({
                content: "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const userId = i.customId.split("_")[2];
        const config = configs[i.guild.id]?.enrol;

        const member =
            await i.guild.members.fetch(userId).catch(() => null);

        if (!member) {
            return i.reply({
                content: "That member is no longer in the server.",
                ephemeral: true
            });
        }

        await member.roles.add(config.role).catch(() => {});

        const key = `${i.guild.id}:${userId}`;

        if (enrolments[key]) {
            enrolments[key].status = "Approved";
        }

        save(ENROL_FILE, enrolments);

        return i.update({
            embeds: [
                createEmbed({
                    title: "Enrolment Approved",
                    description:
                        `${member} has been approved and received the enrolment role.`
                })
            ],
            components: []
        });
    }

    /* ENROL REJECT */

    if (i.customId.startsWith("enrol_reject_")) {
        if (!hasPermission(i, PermissionsBitField.Flags.ManageGuild)) {
            return i.reply({
                content: "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const userId = i.customId.split("_")[2];
        const key = `${i.guild.id}:${userId}`;

        if (enrolments[key]) {
            enrolments[key].status = "Rejected";
        }

        save(ENROL_FILE, enrolments);

        return i.update({
            embeds: [
                createEmbed({
                    title: "Enrolment Rejected",
                    description:
                        `<@${userId}>'s RSA enrolment application has been rejected.`
                })
            ],
            components: []
        });
    }

    /* EMBED TITLE */

    if (i.customId === "embed_title") {
        const modal = new ModalBuilder()
            .setCustomId("embed_title_modal")
            .setTitle("Embed Title");

        const input = new TextInputBuilder()
            .setCustomId("title")
            .setLabel("Title")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(256);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return i.showModal(modal);
    }

    /* EMBED DESCRIPTION */

    if (i.customId === "embed_description") {
        const modal = new ModalBuilder()
            .setCustomId("embed_description_modal")
            .setTitle("Embed Description");

        const input = new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return i.showModal(modal);
    }

    /* EMBED SEND */

    if (i.customId === "embed_send") {
        const session = embedSessions.get(i.user.id);

        if (!session) {
            return i.reply({
                content: "Your embed session has expired.",
                ephemeral: true
            });
        }

        await i.channel.send({
            embeds: [
                createEmbed({
                    title: session.title,
                    description: session.description,
                    footer: session.footer
                })
            ]
        });

        embedSessions.delete(i.user.id);

        return i.update({
            content: "Embed sent successfully.",
            embeds: [],
            components: []
        });
    }

    /* EMBED CANCEL */

    if (i.customId === "embed_cancel") {
        embedSessions.delete(i.user.id);

        return i.update({
            content: "Embed creation cancelled.",
            embeds: [],
            components: []
        });
    }
}

/* =========================================================
   MODALS
========================================================= */

async function modalHandler(i) {

    /* ENROL */

    if (i.customId === "enrol_modal") {
        const config = configs[i.guild.id]?.enrol;

        const roblox =
            i.fields.getTextInputValue("roblox");

        const reason =
            i.fields.getTextInputValue("reason");

        const organisation =
            i.fields.getTextInputValue("organisation") ||
            "Not provided";

        const position =
            i.fields.getTextInputValue("position") ||
            "Not provided";

        const key = `${i.guild.id}:${i.user.id}`;

        enrolments[key] = {
            user: i.user.id,
            roblox,
            reason,
            organisation,
            position,
            status: "Pending",
            submitted: Date.now()
        };

        save(ENROL_FILE, enrolments);

        const channel =
            i.guild.channels.cache.get(config.channel);

        if (channel) {
            await channel.send({
                embeds: [
                    createEmbed({
                        title: "New RSA Enrolment",
                        description:
                            `A new enrolment application has been submitted by ${i.user}.`,
                        fields: [
                            {
                                name: "Roblox Username",
                                value: roblox
                            },
                            {
                                name: "School / Organisation",
                                value: organisation
                            },
                            {
                                name: "Position / Role",
                                value: position
                            },
                            {
                                name: "Reason",
                                value: reason
                            },
                            {
                                name: "Status",
                                value: "Pending Review"
                            }
                        ]
                    })
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `enrol_approve_${i.user.id}`
                            )
                            .setLabel("Approve")
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(
                                `enrol_reject_${i.user.id}`
                            )
                            .setLabel("Reject")
                            .setStyle(ButtonStyle.Danger)
                    )
                ]
            });
        }

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Application Submitted",
                    description:
                        "Your RSA enrolment application has been submitted for review."
                })
            ],
            ephemeral: true
        });
    }

    /* RENAME */

    if (i.customId === "rename_modal") {
        if (!ticketStaff(i)) {
            return i.reply({
                content: "You cannot rename this ticket.",
                ephemeral: true
            });
        }

        const name = i.fields
            .getTextInputValue("name")
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "-")
            .slice(0, 90);

        await i.channel.setName(name);

        return i.reply({
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

    if (i.customId === "add_user_modal") {
        const id = i.fields.getTextInputValue("id").trim();

        const member =
            await i.guild.members.fetch(id).catch(() => null);

        if (!member) {
            return i.reply({
                content: "Member not found.",
                ephemeral: true
            });
        }

        await i.channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        return i.reply({
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

    if (i.customId === "remove_user_modal") {
        const id = i.fields.getTextInputValue("id").trim();

        const owner =
            i.channel.topic?.match(
                /ticket-owner:(\d+)/
            )?.[1];

        if (id === owner) {
            return i.reply({
                content: "The ticket owner cannot be removed.",
                ephemeral: true
            });
        }

        const member =
            await i.guild.members.fetch(id).catch(() => null);

        if (!member) {
            return i.reply({
                content: "Member not found.",
                ephemeral: true
            });
        }

        await i.channel.permissionOverwrites.delete(member.id);

        return i.reply({
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

    /* EMBED TITLE */

    if (i.customId === "embed_title_modal") {
        const session = embedSessions.get(i.user.id);

        if (!session) {
            return i.reply({
                content: "Your embed session has expired.",
                ephemeral: true
            });
        }

        session.title =
            i.fields.getTextInputValue("title");

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Embed Updated",
                    description: "The embed title has been updated."
                })
            ],
            ephemeral: true
        });
    }

    /* EMBED DESCRIPTION */

    if (i.customId === "embed_description_modal") {
        const session = embedSessions.get(i.user.id);

        if (!session) {
            return i.reply({
                content: "Your embed session has expired.",
                ephemeral: true
            });
        }

        session.description =
            i.fields.getTextInputValue("description");

        return i.reply({
            embeds: [
                createEmbed({
                    title: "Embed Updated",
                    description:
                        "The embed description has been updated."
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   ERROR HANDLING
========================================================= */

client.on("error", error => {
    console.error("Discord client error:", error);
});

process.on("unhandledRejection", error => {
    console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught exception:", error);
});

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);
