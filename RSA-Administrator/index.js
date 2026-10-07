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
    AttachmentBuilder,
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
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
const APPLICATIONS_FILE = path.join(
    DATA_DIR,
    "applications.json"
);

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
        console.error(`Failed loading ${file}:`, error);
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
        console.error(`Failed saving ${file}:`, error);
    }
}

const warnings = loadJSON(WARNINGS_FILE, {});
const configs = loadJSON(CONFIG_FILE, {});
const applications = loadJSON(
    APPLICATIONS_FILE,
    {}
);

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
        embed.setTitle(
            brandedTitle(options.title)
        );
    }

    if (options.description) {
        embed.setDescription(
            options.description
        );
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

    /* PUBLIC */

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "View RSA Utility commands."
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check RSA Utility latency."
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription(
            "View information about RSA Utility."
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

    new SlashCommandBuilder()
        .setName("enrol")
        .setDescription(
            "Start an RSA enrolment application."
        ),

    /* MODERATION */

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
                    "Member."
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription(
                    "Duration in minutes."
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
            "Remove a timeout."
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
            "View member warnings."
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
            "Clear member warnings."
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
            "Delete recent messages."
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
                    "Slowmode seconds."
                )
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    /* ROLES */

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage member roles."
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

    /* ANNOUNCEMENTS */

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription(
            "Send an announcement."
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
                    "Announcement message."
                )
                .setRequired(true)
        ),

    /* EMBED */

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the embed creator."
        ),

    /* TICKETS */

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription(
            "Configure the ticket system."
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription(
                    "Ticket category."
                )
                .addChannelTypes(
                    ChannelType.GuildCategory
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("panel")
                .setDescription(
                    "Ticket panel channel."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("logs")
                .setDescription(
                    "Ticket transcript channel."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("support")
                .setDescription(
                    "Ticket support role."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "View ticket configuration."
        ),

    /* CONFIGURATION */

    new SlashCommandBuilder()
        .setName("configure")
        .setDescription(
            "Configure RSA Utility."
        )
        .addSubcommand(sub =>
            sub
                .setName("enrolment")
                .setDescription(
                    "Configure enrolment applications."
                )
                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription(
                            "Application category."
                        )
                        .addChannelTypes(
                            ChannelType.GuildCategory
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("staff")
                        .setDescription(
                            "Staff review role."
                        )
                        .setRequired(true)
                )
        )

].map(command => command.toJSON());

/* =========================================================
   REGISTER
========================================================= */

async function registerCommands() {
    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

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
        `Registered ${commands.length} RSA Utility commands.`
    );
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(
    interaction,
    permission
) {
    return interaction.memberPermissions?.has(
        permission
    );
}

function isStaff(interaction) {
    const config =
        configs[
            interaction.guild?.id
        ]?.enrolment;

    if (
        config?.staffRole &&
        interaction.member?.roles?.cache?.has(
            config.staffRole
        )
    ) {
        return true;
    }

    return (
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
        ) ||
        interaction.guild?.ownerId ===
            interaction.user.id
    );
}

function canModerate(
    interaction,
    member
) {
    if (!member) return false;

    if (
        member.id ===
        interaction.user.id
    ) {
        return false;
    }

    if (
        member.id ===
        interaction.guild.ownerId
    ) {
        return false;
    }

    if (
        interaction.user.id !==
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

/* =========================================================
   TICKET LOG
========================================================= */

async function sendTicketLog(
    guild,
    embed,
    file = null
) {
    const config =
        configs[guild.id]?.ticket;

    if (!config?.logsChannel) return;

    const channel =
        guild.channels.cache.get(
            config.logsChannel
        );

    if (!channel) return;

    const payload = {
        embeds: [embed]
    };

    if (file) {
        payload.files = [file];
    }

    await channel.send(payload).catch(() => {});
}

/* =========================================================
   READY
========================================================= */

client.once(
    "ready",
    async () => {
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
            console.error(
                "Command registration failed:",
                error
            );
        }
    }
);

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {
        try {
            if (interaction.isChatInputCommand()) {
                return handleCommand(interaction);
            }

            if (interaction.isButton()) {
                return handleButton(interaction);
            }

            if (interaction.isModalSubmit()) {
                return handleModal(interaction);
            }
        } catch (error) {
            console.error(
                "Interaction error:",
                error
            );

            const response = {
                content:
                    "Something went wrong while processing that action.",
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

async function handleCommand(interaction) {

    const command =
        interaction.commandName;

    /* =====================================================
       HELP
    ===================================================== */

    if (command === "help") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "RSA Utility",
                    description:
                        "A moderation, management, support and enrolment utility.",
                    fields: [
                        {
                            name: "Public",
                            value:
                                "`/help` `/ping` `/botinfo` `/serverinfo` `/userinfo` `/enrol`"
                        },
                        {
                            name: "Moderation",
                            value:
                                "`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge`"
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
                                "`/announce` `/embed`"
                        },
                        {
                            name: "Tickets",
                            value:
                                "`/ticketsetup` `/ticketconfig`"
                        },
                        {
                            name: "Configuration",
                            value:
                                "`/configure enrolment`"
                        }
                    ],
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       PING
    ===================================================== */

    if (command === "ping") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Bot Status",
                    description:
                        `Pong! WebSocket latency: **${client.ws.ping}ms**`,
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       BOT INFO
    ===================================================== */

    if (command === "botinfo") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "RSA Utility",
                    description:
                        "RSA Utility provides moderation, management, ticket and enrolment tools.",
                    fields: [
                        {
                            name: "Version",
                            value: BOT_VERSION,
                            inline: true
                        },
                        {
                            name: "Servers",
                            value:
                                `${client.guilds.cache.size}`,
                            inline: true
                        },
                        {
                            name: "Commands",
                            value:
                                `${commands.length}`,
                            inline: true
                        }
                    ],
                    footer:
                        "Roblox Schools Association"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       SERVER INFO
    ===================================================== */

    if (command === "serverinfo") {
        const guild =
            interaction.guild;

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Server Information",
                    thumbnail:
                        guild.iconURL({
                            size: 256
                        }) || undefined,
                    fields: [
                        {
                            name: "Server",
                            value: guild.name,
                            inline: true
                        },
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
                        }
                    ],
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       USER INFO
    ===================================================== */

    if (command === "userinfo") {
        const user =
            interaction.options.getUser("user") ||
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
                    .map(role => role.toString())
                    .slice(0, 15)
                    .join(" ") ||
                  "No roles"
                : "Not in server";

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "User Information",
                    thumbnail:
                        user.displayAvatarURL({
                            size: 256
                        }),
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
                    ],
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ENROL
    ===================================================== */

    if (command === "enrol") {
        return startEnrolment(interaction);
    }

    /* =====================================================
       CONFIGURE
    ===================================================== */

    if (command === "configure") {

        if (!isStaff(interaction)) {
            return interaction.reply({
                content:
                    "You need the appropriate staff permissions to configure RSA Utility.",
                ephemeral: true
            });
        }

        const sub =
            interaction.options.getSubcommand();

        if (sub === "enrolment") {

            const category =
                interaction.options.getChannel(
                    "category"
                );

            const staff =
                interaction.options.getRole(
                    "staff"
                );

            configs[
                interaction.guild.id
            ] = {
                ...(
                    configs[
                        interaction.guild.id
                    ] || {}
                ),
                enrolment: {
                    category:
                        category.id,
                    staffRole:
                        staff.id
                }
            };

            saveJSON(
                CONFIG_FILE,
                configs
            );

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Configured",
                        description:
                            "The RSA Utility enrolment system has been configured successfully.",
                        fields: [
                            {
                                name:
                                    "Application Category",
                                value:
                                    category.toString()
                            },
                            {
                                name:
                                    "Review Staff",
                                value:
                                    staff.toString()
                            }
                        ],
                        footer: BOT_NAME
                    })
                ],
                ephemeral: true
            });
        }
    }

    /* =====================================================
       MODERATION
    ===================================================== */

    if (command === "ban") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.BanMembers
            )
        ) {
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

        if (
            member &&
            !canModerate(
                interaction,
                member
            )
        ) {
            return interaction.reply({
                content:
                    "You cannot ban this member.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(
            user.id,
            { reason }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Banned",
                    description:
                        `**${user.tag}** has been banned.`,
                    fields: [
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "kick") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.KickMembers
            )
        ) {
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

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {
            return interaction.reply({
                content:
                    "You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(reason);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Kicked",
                    description:
                        `**${user.tag}** has been kicked.`,
                    fields: [
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "timeout") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
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

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {
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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Timed Out",
                    description:
                        `**${user.tag}** has been timed out.`,
                    fields: [
                        {
                            name: "Duration",
                            value:
                                `${minutes} minute(s)`
                        },
                        {
                            name: "Reason",
                            value: reason
                        },
                        {
                            name: "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "untimeout") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
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

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {
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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Timeout Removed",
                    description:
                        `The timeout has been removed from **${user.tag}**.`,
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "warn") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
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

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {
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
            moderator:
                interaction.user.id,
            timestamp:
                Date.now()
        });

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

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
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "warnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
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
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: "Warnings",
                        description:
                            `**${user.tag}** has no warnings.`,
                        footer: BOT_NAME
                    })
                ],
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        `Warnings — ${user.tag}`,
                    description:
                        list
                            .map(
                                (item, index) =>
                                    `**${index + 1}.** ${item.reason}\nModerator: <@${item.moderator}>\n<t:${Math.floor(
                                        item.timestamp / 1000
                                    )}:R>`
                            )
                            .join("\n\n")
                            .slice(0, 4000),
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    if (command === "clearwarnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser("user");

        delete warnings[
            `${interaction.guild.id}:${user.id}`
        ];

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Warnings Cleared",
                    description:
                        `All warnings for **${user.tag}** have been cleared.`,
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "purge") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Messages Purged",
                    description:
                        `Deleted **${deleted.size}** message(s).`,
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    if (
        command === "lock" ||
        command === "unlock"
    ) {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages:
                    command === "lock"
                        ? false
                        : null
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        command === "lock"
                            ? "Channel Locked"
                            : "Channel Unlocked",
                    description:
                        command === "lock"
                            ? "This channel has been locked."
                            : "This channel has been unlocked.",
                    footer: BOT_NAME
                })
            ]
        });
    }

    if (command === "slowmode") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Slowmode Updated",
                    description:
                        seconds === 0
                            ? "Slowmode has been disabled."
                            : `Slowmode is now **${seconds} seconds**.`,
                    footer: BOT_NAME
                })
            ]
        });
    }

    /* =====================================================
       ROLE
    ===================================================== */

    if (command === "role") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageRoles
            )
        ) {
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
                content: "Member not found.",
                ephemeral: true
            });
        }

        if (
            interaction.user.id !==
                interaction.guild.ownerId &&
            role.position >=
                interaction.member.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "You cannot manage that role.",
                ephemeral: true
            });
        }

        const botMember =
            interaction.guild.members.me;

        if (
            botMember &&
            role.position >=
                botMember.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "My bot role is not high enough to manage that role.",
                ephemeral: true
            });
        }

        if (subcommand === "add") {
            await member.roles.add(role);
        } else {
            await member.roles.remove(role);
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        subcommand === "add"
                            ? "Role Added"
                            : "Role Removed",
                    description:
                        `${subcommand === "add" ? "Added" : "Removed"} ${role} ${subcommand === "add" ? "to" : "from"} **${user.tag}**.`,
                    footer: BOT_NAME
                })
            ]
        });
    }

    /* =====================================================
       ANNOUNCE
    ===================================================== */

    if (command === "announce") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
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

        await interaction.channel.send({
            embeds: [
                createEmbed({
                    title,
                    description: message,
                    footer:
                        "Roblox Schools Association"
                })
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Announcement Sent",
                    description:
                        "The announcement has been sent.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED CREATOR
    ===================================================== */

    if (command === "embed") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        embedSessions.set(
            interaction.user.id,
            {
                title:
                    "RSA Announcement",
                description: "",
                footer:
                    "Roblox Schools Association",
                image: "",
                thumbnail: "",
                fields: []
            }
        );

        return showEmbedBuilder(
            interaction
        );
    }

    /* =====================================================
       TICKET SETUP
    ===================================================== */

    if (command === "ticketsetup") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const category =
            interaction.options.getChannel("category");

        const panel =
            interaction.options.getChannel("panel");

        const logs =
            interaction.options.getChannel("logs");

        const support =
            interaction.options.getRole("support");

        configs[
            interaction.guild.id
        ] = {
            ...(
                configs[
                    interaction.guild.id
                ] || {}
            ),
            ticket: {
                category: category.id,
                panelChannel: panel.id,
                logsChannel: logs.id,
                supportRole: support.id
            }
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        const row =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_create"
                        )
                        .setLabel(
                            "Create Ticket"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        await panel.send({
            embeds: [
                createEmbed({
                    title:
                        "RSA Support",
                    description:
                        "Need assistance? Click the button below to open a private support ticket.",
                    footer: BOT_NAME
                })
            ],
            components: [row]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket System Configured",
                    description:
                        "The ticket system has been configured successfully.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    if (command === "ticketconfig") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const ticket =
            configs[
                interaction.guild.id
            ]?.ticket;

        if (!ticket) {
            return interaction.reply({
                content:
                    "The ticket system has not been configured.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket Configuration",
                    fields: [
                        {
                            name: "Category",
                            value:
                                `<#${ticket.category}>`
                        },
                        {
                            name: "Panel",
                            value:
                                `<#${ticket.panelChannel}>`
                        },
                        {
                            name: "Logs",
                            value:
                                `<#${ticket.logsChannel}>`
                        },
                        {
                            name: "Support",
                            value:
                                `<@&${ticket.supportRole}>`
                        }
                    ],
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   ENROLMENT START
========================================================= */

async function startEnrolment(interaction) {

    const config =
        configs[
            interaction.guild.id
        ]?.enrolment;

    if (!config) {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Unavailable",
                    description:
                        "The enrolment system has not been configured yet. Please contact the RSA staff team.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    try {

        await interaction.user.send({
            embeds: [
                createEmbed({
                    title:
                        "RSA Enrolment",
                    description:
                        "Welcome to the RSA enrolment process.\n\nClick the button below to begin your private enrolment questionnaire.",
                    footer: BOT_NAME
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `enrol_start:${interaction.guild.id}`
                            )
                            .setLabel(
                                "Start Enrolment"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            )
                    )
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Started",
                    description:
                        "I've sent your private enrolment questionnaire to your Discord DMs.\n\nPlease check your direct messages.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });

    } catch {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Unable to DM You",
                    description:
                        "I couldn't send you the enrolment questionnaire. Please enable DMs from server members and run `/enrol` again.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(interaction) {

    /* =====================================================
       ENROL START
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "enrol_start:"
        )
    ) {

        const guildId =
            interaction.customId.split(":")[1];

        const guild =
            client.guilds.cache.get(guildId);

        if (!guild) {
            return interaction.reply({
                content:
                    "The RSA server could not be found.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `enrol_modal:${guildId}`
                )
                .setTitle(
                    "RSA Enrolment"
                );

        const name =
            new TextInputBuilder()
                .setCustomId("full_name")
                .setLabel("Full Name")
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const age =
            new TextInputBuilder()
                .setCustomId("age")
                .setLabel("Age")
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(3);

        const username =
            new TextInputBuilder()
                .setCustomId("roblox_username")
                .setLabel("Roblox Username")
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const experience =
            new TextInputBuilder()
                .setCustomId("experience")
                .setLabel("Previous Experience")
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        const reason =
            new TextInputBuilder()
                .setCustomId("reason")
                .setLabel("Why do you want to enrol?")
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1500);

        modal.addComponents(
            new ActionRowBuilder().addComponents(name),
            new ActionRowBuilder().addComponents(age),
            new ActionRowBuilder().addComponents(username),
            new ActionRowBuilder().addComponents(experience),
            new ActionRowBuilder().addComponents(reason)
        );

        return interaction.showModal(modal);
    }

    /* =====================================================
       ENROL SUBMISSION
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "enrol_submit:"
        )
    ) {

        const applicationId =
            interaction.customId.split(":")[1];

        const application =
            applications[applicationId];

        if (!application) {
            return interaction.reply({
                content:
                    "This enrolment could not be found.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Already Submitted",
                    description:
                        "This enrolment has already been submitted.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       APPLICATION APPROVE
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "application_approve:"
        )
    ) {

        if (!isStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review enrolments.",
                ephemeral: true
            });
        }

        const id =
            interaction.customId.split(":")[1];

        const application =
            applications[id];

        if (!application) {
            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        application.status = "approved";
        application.reviewedBy =
            interaction.user.id;
        application.reviewedAt =
            Date.now();

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const applicant =
            await client.users.fetch(
                application.userId
            ).catch(() => null);

        if (applicant) {
            await applicant.send({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Approved",
                        description:
                            "Your RSA enrolment application has been **approved**.",
                        fields: [
                            {
                                name:
                                    "Reviewed By",
                                value:
                                    interaction.user.toString()
                            }
                        ],
                        footer: BOT_NAME
                    })
                ]
            }).catch(() => {});
        }

        await interaction.update({
            embeds: [
                createApplicationEmbed(
                    application
                )
            ],
            components: [
                applicationResultRow(
                    id,
                    true
                )
            ]
        });

        return;
    }

    /* =====================================================
       APPLICATION DENY
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "application_deny:"
        )
    ) {

        if (!isStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review enrolments.",
                ephemeral: true
            });
        }

        const id =
            interaction.customId.split(":")[1];

        const application =
            applications[id];

        if (!application) {
            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `deny_modal:${id}`
                )
                .setTitle(
                    "Deny Enrolment"
                );

        const reason =
            new TextInputBuilder()
                .setCustomId(
                    "reason"
                )
                .setLabel(
                    "Reason for denial"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1500);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(reason)
        );

        return interaction.showModal(modal);
    }

    /* =====================================================
       REQUEST CHANGES
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "application_changes:"
        )
    ) {

        if (!isStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review enrolments.",
                ephemeral: true
            });
        }

        const id =
            interaction.customId.split(":")[1];

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `changes_modal:${id}`
                )
                .setTitle(
                    "Request Changes"
                );

        const reason =
            new TextInputBuilder()
                .setCustomId(
                    "reason"
                )
                .setLabel(
                    "What needs to be changed?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1500);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(reason)
        );

        return interaction.showModal(modal);
    }

    /* =====================================================
       TICKET CREATE
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_create"
    ) {
        return createTicket(interaction);
    }

    /* =====================================================
       TICKET CLAIM
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_claim"
    ) {

        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to claim tickets.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket Claimed",
                    description:
                        `This ticket has been claimed by ${interaction.user}.`,
                    footer: BOT_NAME
                })
            ]
        });
    }

    /* =====================================================
       TICKET CLOSE
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_close"
    ) {
        return closeTicket(interaction);
    }

    /* =====================================================
       EMBED CREATOR
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "embed_"
        )
    ) {
        return handleEmbedButton(interaction);
    }
}

/* =========================================================
   APPLICATION EMBED
========================================================= */

function createApplicationEmbed(application) {

    const status =
        application.status === "pending"
            ? "Pending Review"
            : application.status === "approved"
                ? "Approved"
                : application.status === "denied"
                    ? "Denied"
                    : application.status === "changes"
                        ? "Changes Requested"
                        : application.status;

    return createEmbed({
        title:
            "Enrolment Application",
        description:
            `**Status:** ${status}`,
        fields: [
            {
                name:
                    "Applicant",
                value:
                    `<@${application.userId}>`
            },
            {
                name:
                    "Full Name",
                value:
                    application.answers.full_name
            },
            {
                name:
                    "Age",
                value:
                    application.answers.age
            },
            {
                name:
                    "Roblox Username",
                value:
                    application.answers.roblox_username
            },
            {
                name:
                    "Previous Experience",
                value:
                    application.answers.experience
            },
            {
                name:
                    "Reason for Enrolment",
                value:
                    application.answers.reason
            },
            ...(application.reviewReason
                ? [
                    {
                        name:
                            "Review Notes",
                        value:
                            application.reviewReason
                    }
                ]
                : [])
        ],
        footer:
            BOT_NAME
    });
}

function applicationReviewRow(id) {

    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `application_approve:${id}`
                )
                .setLabel(
                    "Approve"
                )
                .setStyle(
                    ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    `application_deny:${id}`
                )
                .setLabel(
                    "Deny"
                )
                .setStyle(
                    ButtonStyle.Danger
                ),

            new ButtonBuilder()
                .setCustomId(
                    `application_changes:${id}`
                )
                .setLabel(
                    "Request Changes"
                )
                .setStyle(
                    ButtonStyle.Primary
                )
        );
}

function applicationResultRow(
    id,
    approved = false
) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `application_result:${id}`
                )
                .setLabel(
                    approved
                        ? "Approved"
                        : "Processed"
                )
                .setStyle(
                    approved
                        ? ButtonStyle.Success
                        : ButtonStyle.Secondary
                )
                .setDisabled(true)
        );
}

/* =========================================================
   MODALS
========================================================= */

async function handleModal(interaction) {

    /* =====================================================
       ENROLMENT
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "enrol_modal:"
        )
    ) {

        const guildId =
            interaction.customId.split(":")[1];

        const guild =
            client.guilds.cache.get(guildId);

        if (!guild) {
            return interaction.reply({
                content:
                    "The RSA server could not be found.",
                ephemeral: true
            });
        }

        const config =
            configs[guildId]?.enrolment;

        if (!config) {
            return interaction.reply({
                content:
                    "The enrolment system is not configured.",
                ephemeral: true
            });
        }

        const applicationId =
            `${guildId}-${interaction.user.id}-${Date.now()}`;

        const answers = {
            full_name:
                interaction.fields.getTextInputValue(
                    "full_name"
                ),
            age:
                interaction.fields.getTextInputValue(
                    "age"
                ),
            roblox_username:
                interaction.fields.getTextInputValue(
                    "roblox_username"
                ),
            experience:
                interaction.fields.getTextInputValue(
                    "experience"
                ),
            reason:
                interaction.fields.getTextInputValue(
                    "reason"
                )
        };

        applications[applicationId] = {
            id:
                applicationId,
            guildId,
            userId:
                interaction.user.id,
            answers,
            status:
                "pending",
            createdAt:
                Date.now()
        };

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const submitRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `enrol_submit:${applicationId}`
                        )
                        .setLabel(
                            "Submit Enrolment"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Review Your Enrolment",
                    description:
                        "Please review your answers below. When you're happy with everything, press **Submit Enrolment**.",
                    fields: [
                        {
                            name:
                                "Full Name",
                            value:
                                answers.full_name
                        },
                        {
                            name:
                                "Age",
                            value:
                                answers.age
                        },
                        {
                            name:
                                "Roblox Username",
                            value:
                                answers.roblox_username
                        },
                        {
                            name:
                                "Previous Experience",
                            value:
                                answers.experience
                        },
                        {
                            name:
                                "Reason",
                            value:
                                answers.reason
                        }
                    ],
                    footer:
                        BOT_NAME
                })
            ],
            components: [
                submitRow
            ]
        });
    }

    /* =====================================================
       DENIAL
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "deny_modal:"
        )
    ) {

        if (!isStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review enrolments.",
                ephemeral: true
            });
        }

        const id =
            interaction.customId.split(":")[1];

        const application =
            applications[id];

        if (!application) {
            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        const reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        application.status =
            "denied";

        application.reviewReason =
            reason;

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const applicant =
            await client.users.fetch(
                application.userId
            ).catch(() => null);

        if (applicant) {
            await applicant.send({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Denied",
                        description:
                            "Your RSA enrolment application has been **denied**.",
                        fields: [
                            {
                                name:
                                    "Reason",
                                value:
                                    reason
                            }
                        ],
                        footer:
                            BOT_NAME
                    })
                ]
            }).catch(() => {});
        }

        await interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Denied",
                    description:
                        "The applicant has been notified.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });

        await interaction.message.edit({
            embeds: [
                createApplicationEmbed(
                    application
                )
            ],
            components: [
                applicationResultRow(
                    id
                )
            ]
        }).catch(() => {});

        return;
    }

    /* =====================================================
       REQUEST CHANGES
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "changes_modal:"
        )
    ) {

        if (!isStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review enrolments.",
                ephemeral: true
            });
        }

        const id =
            interaction.customId.split(":")[1];

        const application =
            applications[id];

        if (!application) {
            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        const reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        application.status =
            "changes";

        application.reviewReason =
            reason;

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const applicant =
            await client.users.fetch(
                application.userId
            ).catch(() => null);

        if (applicant) {
            await applicant.send({
                embeds: [
                    createEmbed({
                        title:
                            "Changes Requested",
                        description:
                            "The RSA staff team has requested changes to your enrolment application.",
                        fields: [
                            {
                                name:
                                    "Changes Required",
                                value:
                                    reason
                            }
                        ],
                        footer:
                            BOT_NAME
                    })
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    `enrol_resubmit:${id}`
                                )
                                .setLabel(
                                    "Resubmit Enrolment"
                                )
                                .setStyle(
                                    ButtonStyle.Primary
                                )
                        )
                ]
            }).catch(() => {});
        }

        await interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Changes Requested",
                    description:
                        "The applicant has been notified.",
                    footer: BOT_NAME
                })
            ],
            ephemeral: true
        });

        await interaction.message.edit({
            embeds: [
                createApplicationEmbed(
                    application
                )
            ],
            components: [
                applicationResultRow(id)
            ]
        }).catch(() => {});

        return;
    }

    /* =====================================================
       EMBED MODALS
    ===================================================== */

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) return;

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

    return interaction.reply({
        embeds: [
            createEmbed({
                title:
                    "Embed Updated",
                description:
                    "Your embed has been updated.",
                footer: BOT_NAME
            })
        ],
        ephemeral: true
    });
}

/* =========================================================
   ENROLMENT SUBMISSION
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        if (
            !interaction.isButton()
        ) {
            return;
        }

        if (
            interaction.customId.startsWith(
                "enrol_submit:"
            )
        ) {

            const id =
                interaction.customId.split(":")[1];

            const application =
                applications[id];

            if (!application) {
                return interaction.reply({
                    content:
                        "Application not found.",
                    ephemeral: true
                });
            }

            if (
                application.userId !==
                interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        "This is not your enrolment.",
                    ephemeral: true
                });
            }

            if (
                application.status !==
                "pending"
            ) {
                return interaction.reply({
                    content:
                        "This enrolment has already been submitted.",
                    ephemeral: true
                });
            }

            application.submittedAt =
                Date.now();

            saveJSON(
                APPLICATIONS_FILE,
                applications
            );

            const guild =
                client.guilds.cache.get(
                    application.guildId
                );

            const config =
                configs[
                    application.guildId
                ]?.enrolment;

            if (!guild || !config) {
                return interaction.reply({
                    content:
                        "The enrolment system is no longer configured.",
                    ephemeral: true
                });
            }

            const category =
                guild.channels.cache.get(
                    config.category
                );

            const staffRole =
                guild.roles.cache.get(
                    config.staffRole
                );

            if (!category || !staffRole) {
                return interaction.reply({
                    content:
                        "The enrolment configuration is incomplete.",
                    ephemeral: true
                });
            }

            const safeName =
                interaction.user.username
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]/g,
                        "-"
                    )
                    .replace(
                        /-+/g,
                        "-"
                    )
                    .slice(
                        0,
                        20
                    );

            const channel =
                await guild.channels.create({
                    name:
                        `enrolment-${safeName}`,
                    type:
                        ChannelType.GuildText,
                    parent:
                        category.id,
                    topic:
                        `enrolment:${id}`,
                    permissionOverwrites: [
                        {
                            id:
                                guild.roles.everyone.id,
                            deny: [
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        },
                        {
                            id:
                                staffRole.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory
                            ]
                        },
                        {
                            id:
                                client.user.id,
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

            application.channelId =
                channel.id;

            saveJSON(
                APPLICATIONS_FILE,
                applications
            );

            await channel.send({
                content:
                    `<@&${staffRole.id}>`,
                embeds: [
                    createApplicationEmbed(
                        application
                    )
                ],
                components: [
                    applicationReviewRow(id)
                ]
            });

            await interaction.update({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Submitted",
                        description:
                            "Your enrolment has been submitted successfully.\n\nThe RSA staff team will now review your application.",
                        footer: BOT_NAME
                    })
                ],
                components: []
            });
        }
    }
);

/* =========================================================
   TICKET HELPERS
========================================================= */

function isTicketStaff(interaction) {

    const config =
        configs[
            interaction.guild?.id
        ]?.ticket;

    if (!config) {
        return hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        );
    }

    return (
        interaction.member.roles.cache.has(
            config.supportRole
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        ) ||
        interaction.guild.ownerId ===
            interaction.user.id
    );
}

function getTicketOwner(channel) {

    if (!channel?.topic) {
        return null;
    }

    const match =
        channel.topic.match(
            /ticket-owner:(\d+)/
        );

    return match
        ? match[1]
        : null;
}

/* =========================================================
   CREATE TICKET
========================================================= */

async function createTicket(interaction) {

    const config =
        configs[
            interaction.guild.id
        ]?.ticket;

    if (!config) {
        return interaction.reply({
            content:
                "The ticket system has not been configured.",
            ephemeral: true
        });
    }

    await interaction.deferReply({
        ephemeral: true
    });

    const existing =
        interaction.guild.channels.cache.find(
            channel =>
                channel.type ===
                    ChannelType.GuildText &&
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
        interaction.guild.channels.cache.get(
            config.category
        );

    const supportRole =
        interaction.guild.roles.cache.get(
            config.supportRole
        );

    if (!category || !supportRole) {
        return interaction.editReply({
            content:
                "The ticket configuration is incomplete."
        });
    }

    const safeName =
        interaction.user.username
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .slice(
                0,
                20
            );

    const channel =
        await interaction.guild.channels.create({
            name:
                `ticket-${safeName}`,
            type:
                ChannelType.GuildText,
            parent:
                category.id,
            topic:
                `ticket-owner:${interaction.user.id}`,
            permissionOverwrites: [
                {
                    id:
                        interaction.guild.roles.everyone.id,
                    deny: [
                        PermissionsBitField.Flags.ViewChannel
                    ]
                },
                {
                    id:
                        interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id:
                        supportRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                },
                {
                    id:
                        client.user.id,
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

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_claim"
                    )
                    .setLabel(
                        "Claim"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_close"
                    )
                    .setLabel(
                        "Close"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    await channel.send({
        content:
            `${interaction.user} <@&${supportRole.id}>`,
        embeds: [
            createEmbed({
                title:
                    "Support Ticket",
                description:
                    `Welcome ${interaction.user}.\n\nPlease explain your enquiry clearly and a member of the support team will assist you.`,
                footer: BOT_NAME
            })
        ],
        components: [row]
    });

    return interaction.editReply({
        content:
            `Your ticket has been created: ${channel}`
    });
}

/* =========================================================
   CLOSE TICKET
========================================================= */

async function closeTicket(interaction) {

    if (
        !interaction.channel?.topic?.startsWith(
            "ticket-owner:"
        )
    ) {
        return interaction.reply({
            content:
                "This is not a ticket channel.",
            ephemeral: true
        });
    }

    const ownerId =
        getTicketOwner(
            interaction.channel
        );

    if (
        !isTicketStaff(interaction) &&
        ownerId !== interaction.user.id
    ) {
        return interaction.reply({
            content:
                "You cannot close this ticket.",
            ephemeral: true
        });
    }

    await interaction.reply({
        embeds: [
            createEmbed({
                title:
                    "Ticket Closing",
                description:
                    "This ticket will now be closed.",
                footer: BOT_NAME
            })
        ]
    });

    const channel =
        interaction.channel;

    const messages =
        await channel.messages
            .fetch({ limit: 100 })
            .catch(() => null);

    let transcript =
        `${BOT_NAME} Ticket Transcript\n\n`;

    if (messages) {
        const ordered =
            [...messages.values()]
                .sort(
                    (a, b) =>
                        a.createdTimestamp -
                        b.createdTimestamp
                );

        for (const message of ordered) {
            transcript +=
                `[${new Date(
                    message.createdTimestamp
                ).toISOString()}] ${message.author.tag}: ${message.content || "[No text]"}\n`;
        }
    }

    const attachment =
        new AttachmentBuilder(
            Buffer.from(
                transcript,
                "utf8"
            ),
            {
                name:
                    `${channel.name}-transcript.txt`
            }
        );

    await sendTicketLog(
        interaction.guild,
        createEmbed({
            title:
                "Ticket Closed",
            description:
                `Ticket **#${channel.name}** was closed.`,
            fields: [
                {
                    name:
                        "Closed By",
                    value:
                        interaction.user.toString()
                },
                {
                    name:
                        "Owner",
                    value:
                        ownerId
                            ? `<@${ownerId}>`
                            : "Unknown"
                }
            ],
            footer: BOT_NAME
        }),
        attachment
    );

    setTimeout(
        () =>
            channel.delete().catch(() => {}),
        1500
    );
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
            "Use the controls below to build your embed.",
        footer:
            session.footer ||
            "Roblox Schools Association",
        image:
            session.image ||
            undefined,
        thumbnail:
            session.thumbnail ||
            undefined,
        fields:
            session.fields?.length
                ? session.fields
                : undefined
    });
}

async function showEmbedBuilder(interaction) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

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
                        "embed_preview"
                    )
                    .setLabel(
                        "Preview"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_send"
                    )
                    .setLabel(
                        "Send"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    )
            );

    return interaction.reply({
        content:
            "### RSA Utility Embed Creator",
        embeds: [
            buildCreatorEmbed(session)
        ],
        components: [row],
        ephemeral: true
    });
}

async function handleEmbedButton(interaction) {

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

    if (
        interaction.customId ===
        "embed_title"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_title"
                )
                .setTitle(
                    "Embed Title"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "title"
                )
                .setLabel(
                    "Title"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(256);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(modal);
    }

    if (
        interaction.customId ===
        "embed_description"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_description"
                )
                .setTitle(
                    "Embed Description"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "description"
                )
                .setLabel(
                    "Description"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(4000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(modal);
    }

    if (
        interaction.customId ===
        "embed_preview"
    ) {
        return interaction.reply({
            embeds: [
                buildCreatorEmbed(session)
            ],
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "embed_send"
    ) {

        await interaction.channel.send({
            embeds: [
                buildCreatorEmbed(session)
            ]
        });

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "Embed sent successfully.",
            embeds: [],
            components: []
        });
    }
}

/* =========================================================
   ERRORS
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
