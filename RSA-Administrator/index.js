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
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

const WARNINGS_FILE = path.join(
    DATA_DIR,
    "warnings.json"
);

const CONFIG_FILE = path.join(
    DATA_DIR,
    "config.json"
);

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
        console.error(
            `Failed to load ${file}:`,
            error
        );

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
        console.error(
            `Failed to save ${file}:`,
            error
        );
    }
}

const warnings = loadJSON(
    WARNINGS_FILE,
    {}
);

const configs = loadJSON(
    CONFIG_FILE,
    {}
);

const applications = loadJSON(
    APPLICATIONS_FILE,
    {}
);

const embedSessions = new Map();

const pendingEnrolments = new Map();

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

    /* HELP */

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "View RSA Utility commands."
        ),

    /* INFORMATION */

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check the bot's latency."
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

    /* =====================================================
       ENROLMENT
    ===================================================== */

    new SlashCommandBuilder()
        .setName("enrol")
        .setDescription(
            "Start an RSA enrolment application."
        ),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription(
            "Configure the RSA enrolment system."
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription(
                    "Category where application channels are created."
                )
                .addChannelTypes(
                    ChannelType.GuildCategory
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("review")
                .setDescription(
                    "Channel where staff can review applications."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("staff")
                .setDescription(
                    "Role allowed to review applications."
                )
                .setRequired(true)
        ),

    /* =====================================================
       MODERATION
    ===================================================== */

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
                    "Reason for the ban."
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
                    "Reason for the kick."
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
                    "Timeout duration in minutes."
                )
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the timeout."
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
                    "Reason for the warning."
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
            "Delete recent messages."
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(
                    "Number of messages to delete."
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
                    "Slowmode duration."
                )
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    /* =====================================================
       ROLE
    ===================================================== */

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage member roles."
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription(
                    "Add a role to a member."
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
                    "Remove a role from a member."
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

    /* =====================================================
       ANNOUNCEMENT
    ===================================================== */

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
                    "Announcement message."
                )
                .setRequired(true)
        ),

    /* =====================================================
       EMBED
    ===================================================== */

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the RSA Utility embed creator."
        ),

    /* =====================================================
       TICKETS
    ===================================================== */

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription(
            "Configure the RSA Utility ticket system."
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription(
                    "Category where tickets are created."
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
                    "Channel where the ticket panel is sent."
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
                    "Channel where ticket transcripts are sent."
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
                    "Role that manages tickets."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "View the ticket system configuration."
        )

].map(command => command.toJSON());

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {
    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    console.log(
        "Registering RSA Utility commands..."
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
        `Registered ${commands.length} commands.`
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

function isEnrolStaff(interaction) {
    const config =
        configs[
            interaction.guild.id
        ]?.enrol;

    if (!config?.staffRole) {
        return (
            hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            ) ||
            interaction.guild.ownerId ===
                interaction.user.id
        );
    }

    return (
        interaction.member.roles.cache.has(
            config.staffRole
        ) ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
        ) ||
        interaction.guild.ownerId ===
            interaction.user.id
    );
}

function isTicketStaff(interaction) {
    const config =
        configs[
            interaction.guild.id
        ]?.ticket;

    if (!config?.supportRole) {
        return (
            hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            ) ||
            interaction.guild.ownerId ===
                interaction.user.id
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

function canModerate(
    interaction,
    member
) {
    if (!member) {
        return false;
    }

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
   TICKET LOGGING
========================================================= */

async function sendTicketLog(
    guild,
    embed,
    file = null
) {
    const config =
        configs[guild.id]?.ticket;

    if (!config?.logsChannel) {
        return;
    }

    const channel =
        guild.channels.cache.get(
            config.logsChannel
        );

    if (!channel) {
        return;
    }

    const payload = {
        embeds: [embed]
    };

    if (file) {
        payload.files = [file];
    }

    await channel.send(payload)
        .catch(() => {});
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
   INTERACTION ROUTER
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
                return;
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

async function handleCommand(
    interaction
) {
    const command =
        interaction.commandName;

    /* =====================================================
       HELP
    ===================================================== */

    if (command === "help") {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "RSA Utility Help",
                    description:
                        "RSA Utility provides moderation, management, support and enrolment tools.",
                    fields: [
                        {
                            name: "Information",
                            value:
                                "`/ping` `/botinfo` `/serverinfo` `/userinfo`"
                        },
                        {
                            name: "Enrolment",
                            value:
                                "`/enrol` — Start an enrolment application\n`/enrolconfig` — Configure enrolments"
                        },
                        {
                            name: "Moderation",
                            value:
                                "`/ban` `/kick` `/timeout` `/untimeout`\n`/warn` `/warnings` `/clearwarnings` `/purge`"
                        },
                        {
                            name: "Channel Management",
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
                        }
                    ],
                    footer:
                        "RSA Utility"
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
                        `Pong! Current WebSocket latency: **${client.ws.ping}ms**`,
                    footer:
                        "RSA Utility"
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
                        "RSA Utility provides moderation, management, information, support and enrolment tools.",
                    fields: [
                        {
                            name: "Version",
                            value:
                                BOT_VERSION,
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
                        }),
                    fields: [
                        {
                            name: "Server",
                            value:
                                guild.name,
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
                        },
                        {
                            name: "Created",
                            value:
                                `<t:${Math.floor(
                                    guild.createdTimestamp / 1000
                                )}:F>`
                        }
                    ],
                    footer:
                        "RSA Utility"
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
                            value:
                                user.tag
                        },
                        {
                            name: "User ID",
                            value:
                                user.id
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
                            value:
                                roles
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ENROL
    ===================================================== */

    if (command === "enrol") {
        const config =
            configs[
                interaction.guild.id
            ]?.enrol;

        if (!config) {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Unavailable",
                        description:
                            "The enrolment system has not been configured yet. Please contact a member of staff.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const existing =
            Object.values(applications)
                .find(
                    application =>
                        application.guildId ===
                            interaction.guild.id &&
                        application.userId ===
                            interaction.user.id &&
                        (
                            application.status ===
                                "pending" ||
                            application.status ===
                                "changes_requested"
                        )
                );

        if (existing) {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Existing Application",
                        description:
                            "You already have an active enrolment application.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        try {
            const dm =
                await interaction.user.createDM();

            const button =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `enrol_start_${interaction.guild.id}`
                            )
                            .setLabel(
                                "Start Enrolment"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            )
                    );

            await dm.send({
                embeds: [
                    createEmbed({
                        title:
                            "RSA Enrolment",
                        description:
                            `You are applying to enrol with **${interaction.guild.name}**.\n\nYour questionnaire is private and will only be used to process your application.\n\nClick **Start Enrolment** below to begin.`,
                        footer:
                            "RSA Utility"
                    })
                ],
                components: [
                    button
                ]
            });

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Check Your DMs",
                        description:
                            "I've sent you the private enrolment questionnaire in your DMs.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });

        } catch (error) {
            console.error(
                "Could not DM enrolment user:",
                error
            );

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Unable To DM You",
                        description:
                            "I couldn't send you a DM. Please enable Direct Messages from server members and try `/enrol` again.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }
    }

    /* =====================================================
       ENROL CONFIG
    ===================================================== */

    if (command === "enrolconfig") {
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

        const category =
            interaction.options.getChannel(
                "category"
            );

        const review =
            interaction.options.getChannel(
                "review"
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
            enrol: {
                category: category.id,
                reviewChannel: review.id,
                staffRole: staff.id
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
                        "The RSA enrolment system has been configured successfully.",
                    fields: [
                        {
                            name:
                                "Application Category",
                            value:
                                category.toString()
                        },
                        {
                            name:
                                "Review Channel",
                            value:
                                review.toString()
                        },
                        {
                            name:
                                "Staff Role",
                            value:
                                staff.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       BAN
    ===================================================== */

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

        if (
            member &&
            !canModerate(
                interaction,
                member
            )
        ) {
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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Member Banned",
                    description:
                        `**${user.tag}** has been banned.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       KICK
    ===================================================== */

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
                    title:
                        "Member Kicked",
                    description:
                        `**${user.tag}** has been kicked.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       TIMEOUT
    ===================================================== */

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
                    title:
                        "Member Timed Out",
                    description:
                        `**${user.tag}** has been timed out.`,
                    fields: [
                        {
                            name:
                                "Duration",
                            value:
                                `${minutes} minute(s)`
                        },
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       UNTIMEOUT
    ===================================================== */

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
                    title:
                        "Timeout Removed",
                    description:
                        `The timeout has been removed from **${user.tag}**.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       WARN
    ===================================================== */

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
                    title:
                        "Member Warned",
                    description:
                        `**${user.tag}** has been warned.`,
                    fields: [
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        },
                        {
                            name:
                                "Moderator",
                            value:
                                interaction.user.toString()
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       WARNINGS
    ===================================================== */

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
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Warnings",
                        description:
                            `**${user.tag}** has no warnings.`,
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const description =
            list.map(
                (item, index) =>
                    `**${index + 1}.** ${item.reason}\n` +
                    `Moderator: <@${item.moderator}>\n` +
                    `<t:${Math.floor(
                        item.timestamp / 1000
                    )}:R>`
            ).join("\n\n");

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        `Warnings — ${user.tag}`,
                    description:
                        description.slice(0, 4000),
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       CLEAR WARNINGS
    ===================================================== */

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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Warnings Cleared",
                    description:
                        `All warnings for **${user.tag}** have been cleared.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       PURGE
    ===================================================== */

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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Messages Purged",
                    description:
                        `Deleted **${deleted.size}** message(s).`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       LOCK
    ===================================================== */

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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Channel Locked",
                    description:
                        "This channel has been locked.",
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       UNLOCK
    ===================================================== */

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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Channel Unlocked",
                    description:
                        "This channel has been unlocked.",
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       SLOWMODE
    ===================================================== */

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

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Slowmode Updated",
                    description:
                        seconds === 0
                            ? "Slowmode has been disabled."
                            : `Slowmode is now set to **${seconds} seconds**.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       ROLE
    ===================================================== */

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

        if (
            role.position >=
                interaction.member.roles.highest.position &&
            interaction.user.id !==
                interaction.guild.ownerId
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

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Role Added",
                        description:
                            `Added ${role} to **${user.tag}**.`,
                        footer:
                            "RSA Utility"
                    })
                ]
            });
        }

        await member.roles.remove(role);

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Role Removed",
                    description:
                        `Removed ${role} from **${user.tag}**.`,
                    footer:
                        "RSA Utility"
                })
            ]
        });
    }

    /* =====================================================
       ANNOUNCE
    ===================================================== */

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

        await interaction.channel.send({
            embeds: [
                createEmbed({
                    title,
                    description:
                        message,
                    footer:
                        "Roblox Schools Association"
                })
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Announcement Sent",
                    description:
                        "The announcement has been sent.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED
    ===================================================== */

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
                title:
                    "RSA Announcement",
                description:
                    "",
                footer:
                    "Roblox Schools Association",
                image:
                    "",
                thumbnail:
                    "",
                fields:
                    []
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
                category:
                    category.id,
                panelChannel:
                    panel.id,
                logsChannel:
                    logs.id,
                supportRole:
                    support.id
            }
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        const panelEmbed =
            createEmbed({
                title:
                    "RSA Support",
                description:
                    "Need assistance? Click the button below to open a private support ticket.\n\nA member of the support team will assist you as soon as possible.",
                footer:
                    "Roblox Schools Association"
            });

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
                panelEmbed
            ],
            components: [
                row
            ]
        });

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket System Configured",
                    description:
                        "The RSA Utility ticket system has been configured successfully.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET CONFIG
    ===================================================== */

    if (command === "ticketconfig") {
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

        const ticket =
            configs[
                interaction.guild.id
            ]?.ticket;

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
                    title:
                        "Ticket Configuration",
                    fields: [
                        {
                            name:
                                "Category",
                            value:
                                `<#${ticket.category}>`
                        },
                        {
                            name:
                                "Panel Channel",
                            value:
                                `<#${ticket.panelChannel}>`
                        },
                        {
                            name:
                                "Logs Channel",
                            value:
                                `<#${ticket.logsChannel}>`
                        },
                        {
                            name:
                                "Support Role",
                            value:
                                `<@&${ticket.supportRole}>`
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }
}

/* =========================================================
   ENROLMENT BUTTONS
========================================================= */

async function handleEnrolButton(
    interaction
) {
    const parts =
        interaction.customId.split("_");

    const guildId =
        parts[2];

    const guild =
        client.guilds.cache.get(
            guildId
        );

    if (!guild) {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Error",
                    description:
                        "The application server could not be found.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    const config =
        configs[guildId]?.enrol;

    if (!config) {
        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Unavailable",
                    description:
                        "The enrolment system is no longer configured.",
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    const modal =
        new ModalBuilder()
            .setCustomId(
                `modal_enrol_${guildId}`
            )
            .setTitle(
                "RSA Enrolment"
            );

    const realName =
        new TextInputBuilder()
            .setCustomId(
                "real_name"
            )
            .setLabel(
                "Your Name"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(100);

    const roblox =
        new TextInputBuilder()
            .setCustomId(
                "roblox_username"
            )
            .setLabel(
                "Roblox Username"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(100);

    const age =
        new TextInputBuilder()
            .setCustomId(
                "age"
            )
            .setLabel(
                "Age"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(3);

    const experience =
        new TextInputBuilder()
            .setCustomId(
                "experience"
            )
            .setLabel(
                "Previous Experience"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(true)
            .setMaxLength(1000);

    const reason =
        new TextInputBuilder()
            .setCustomId(
                "reason"
            )
            .setLabel(
                "Why should we accept you?"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(true)
            .setMaxLength(1500);

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(realName),

        new ActionRowBuilder()
            .addComponents(roblox),

        new ActionRowBuilder()
            .addComponents(age),

        new ActionRowBuilder()
            .addComponents(experience),

        new ActionRowBuilder()
            .addComponents(reason)
    );

    pendingEnrolments.set(
        interaction.user.id,
        {
            guildId
        }
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   APPLICATION REVIEW BUTTONS
========================================================= */

async function handleApplicationButton(
    interaction
) {
    const parts =
        interaction.customId.split("_");

    const action =
        parts[1];

    const applicationId =
        parts.slice(2).join("_");

    const application =
        applications[
            applicationId
        ];

    if (!application) {
        return interaction.reply({
            content:
                "This application could not be found.",
            ephemeral: true
        });
    }

    const guild =
        interaction.guild;

    if (!guild) {
        return interaction.reply({
            content:
                "This action can only be used inside the server.",
            ephemeral: true
        });
    }

    if (!isEnrolStaff(interaction)) {
        return interaction.reply({
            content:
                "You do not have permission to review enrolment applications.",
            ephemeral: true
        });
    }

    if (
        application.status ===
            "approved" ||
        application.status ===
            "denied"
    ) {
        return interaction.reply({
            content:
                `This application has already been ${application.status}.`,
            ephemeral: true
        });
    }

    if (action === "approve") {
        application.status =
            "approved";

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const applicant =
            await client.users
                .fetch(
                    application.userId
                )
                .catch(() => null);

        if (applicant) {
            await applicant.send({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Approved",
                        description:
                            `Your enrolment application for **${guild.name}** has been approved.\n\nCongratulations!`,
                        footer:
                            "RSA Utility"
                    })
                ]
            }).catch(() => {});
        }

        await interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Application",
                    description:
                        "This application has been **approved**.",
                    fields: [
                        {
                            name:
                                "Applicant",
                            value:
                                `<@${application.userId}>`
                        },
                        {
                            name:
                                "Reviewed By",
                            value:
                                interaction.user.toString()
                        },
                        {
                            name:
                                "Status",
                            value:
                                "Approved"
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: []
        });

        return;
    }

    if (action === "deny") {
        const modal =
            new ModalBuilder()
                .setCustomId(
                    `modal_deny_${applicationId}`
                )
                .setTitle(
                    "Deny Application"
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
                .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(reason)
        );

        return interaction.showModal(
            modal
        );
    }

    if (action === "changes") {
        const modal =
            new ModalBuilder()
                .setCustomId(
                    `modal_changes_${applicationId}`
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

        return interaction.showModal(
            modal
        );
    }
}

/* =========================================================
   GENERAL BUTTON HANDLER
========================================================= */

async function handleButton(
    interaction
) {
    /* ENROLMENT START */

    if (
        interaction.customId.startsWith(
            "enrol_start_"
        )
    ) {
        return handleEnrolButton(
            interaction
        );
    }

    /* APPLICATION REVIEW */

    if (
        interaction.customId.startsWith(
            "application_"
        )
    ) {
        return handleApplicationButton(
            interaction
        );
    }

    /* =====================================================
       TICKET CREATE
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_create"
    ) {
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

        if (!category) {
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
                .replace(/^ -|-$/g, "")
                .slice(0, 20) ||
            "user";

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

        await channel.send({
            content:
                `${interaction.user} <@&${supportRole.id}>`,
            embeds: [
                createEmbed({
                    title:
                        "Support Ticket",
                    description:
                        `Welcome ${interaction.user}.\n\nPlease explain your enquiry clearly and provide any relevant information. A member of the support team will assist you shortly.`,
                    fields: [
                        {
                            name:
                                "Ticket Owner",
                            value:
                                interaction.user.toString()
                        },
                        {
                            name:
                                "Status",
                            value:
                                "Unclaimed"
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
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
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_modpanel"
                            )
                            .setLabel(
                                "Mod Panel"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    )
            ]
        });

        await sendTicketLog(
            interaction.guild,
            createEmbed({
                title:
                    "Ticket Created",
                description:
                    "A new support ticket has been created.",
                fields: [
                    {
                        name:
                            "Ticket",
                        value:
                            channel.toString()
                    },
                    {
                        name:
                            "Owner",
                        value:
                            interaction.user.toString()
                    }
                ],
                footer:
                    "RSA Utility"
            })
        );

        return interaction.editReply({
            content:
                `Your ticket has been created: ${channel}`
        });
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

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Support Ticket",
                    description:
                        ownerId
                            ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information.`
                            : "Support ticket.",
                    fields: [
                        {
                            name:
                                "Ticket Owner",
                            value:
                                ownerId
                                    ? `<@${ownerId}>`
                                    : "Unknown"
                        },
                        {
                            name:
                                "Status",
                            value:
                                `Claimed by ${interaction.user}`
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_unclaim"
                            )
                            .setLabel(
                                "Unclaim"
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
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_modpanel"
                            )
                            .setLabel(
                                "Mod Panel"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    )
            ]
        });
    }

    /* =====================================================
       TICKET UNCLAIM
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_unclaim"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to unclaim tickets.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Support Ticket",
                    description:
                        ownerId
                            ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information.`
                            : "Support ticket.",
                    fields: [
                        {
                            name:
                                "Ticket Owner",
                            value:
                                ownerId
                                    ? `<@${ownerId}>`
                                    : "Unknown"
                        },
                        {
                            name:
                                "Status",
                            value:
                                "Unclaimed"
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
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
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_modpanel"
                            )
                            .setLabel(
                                "Mod Panel"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    )
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
                    "You do not have permission to close this ticket.",
                ephemeral: true
            });
        }

        return closeTicket(
            interaction
        );
    }

    /* =====================================================
       TICKET MOD PANEL
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_modpanel"
    ) {
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
                    title:
                        "Ticket Moderator Panel",
                    description:
                        "Use the controls below to manage this ticket.",
                    footer:
                        "RSA Utility"
                })
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_rename"
                            )
                            .setLabel(
                                "Rename"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_unclaim"
                            )
                            .setLabel(
                                "Unclaim"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_adduser"
                            )
                            .setLabel(
                                "Add User"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            ),
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_removeuser"
                            )
                            .setLabel(
                                "Remove User"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "ticket_close"
                            )
                            .setLabel(
                                "Close Ticket"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    )
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET RENAME
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_rename"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_rename"
                )
                .setTitle(
                    "Rename Ticket"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "ticket_name"
                )
                .setLabel(
                    "New Ticket Name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(90)
                .setValue(
                    interaction.channel.name
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       TICKET ADD USER
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_adduser"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_adduser"
                )
                .setTitle(
                    "Add User"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "user_id"
                )
                .setLabel(
                    "Discord User ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       TICKET REMOVE USER
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_removeuser"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_removeuser"
                )
                .setTitle(
                    "Remove User"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "user_id"
                )
                .setLabel(
                    "Discord User ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       EMBED CREATOR
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "embed_"
        )
    ) {
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

        if (
            interaction.customId ===
            "embed_title"
        ) {
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

        if (
            interaction.customId ===
            "embed_description"
        ) {
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

        if (
            interaction.customId ===
            "embed_extra"
        ) {
            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "modal_extra"
                    )
                    .setTitle(
                        "Images and Footer"
                    );

            const footer =
                new TextInputBuilder()
                    .setCustomId(
                        "footer"
                    )
                    .setLabel(
                        "Footer"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(false)
                    .setValue(
                        session.footer || ""
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
                        session.image || ""
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
                        session.thumbnail || ""
                    );

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(footer),
                new ActionRowBuilder()
                    .addComponents(image),
                new ActionRowBuilder()
                    .addComponents(thumbnail)
            );

            return interaction.showModal(
                modal
            );
        }

        if (
            interaction.customId ===
            "embed_field"
        ) {
            if (
                session.fields.length >=
                25
            ) {
                return interaction.reply({
                    content:
                        "Discord allows a maximum of 25 embed fields.",
                    ephemeral: true
                });
            }

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
                        "Field Name"
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
                        "Field Value"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true)
                    .setMaxLength(1024);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(name),
                new ActionRowBuilder()
                    .addComponents(value)
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
                embeds: [
                    buildCreatorEmbed(
                        session
                    )
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
                    buildCreatorEmbed(
                        session
                    )
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

        if (
            interaction.customId ===
            "embed_cancel"
        ) {
            embedSessions.delete(
                interaction.user.id
            );

            return interaction.update({
                content:
                    "Embed creation cancelled.",
                embeds: [],
                components: []
            });
        }
    }
}

/* =========================================================
   EMBED CREATOR
========================================================= */

function buildCreatorEmbed(
    session
) {
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
            session.fields.length
                ? session.fields
                : undefined
    });
}

async function showEmbedBuilder(
    interaction
) {
    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return;
    }

    const row1 =
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
                        "embed_extra"
                    )
                    .setLabel(
                        "Images / Footer"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "embed_field"
                    )
                    .setLabel(
                        "Add Field"
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
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_cancel"
                    )
                    .setLabel(
                        "Cancel"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    const payload = {
        content:
            "### RSA Utility Embed Creator\nBuild your embed using the controls below.",
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
        return interaction.editReply(
            payload
        );
    }

    return interaction.reply(
        payload
    );
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(
    interaction
) {
    /* =====================================================
       ENROLMENT SUBMISSION
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "modal_enrol_"
        )
    ) {
        const guildId =
            interaction.customId.replace(
                "modal_enrol_",
                ""
            );

        const guild =
            client.guilds.cache.get(
                guildId
            );

        if (!guild) {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Error",
                        description:
                            "The server could not be found.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const config =
            configs[guildId]?.enrol;

        if (!config) {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Unavailable",
                        description:
                            "The enrolment system is not configured.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const existing =
            Object.values(applications)
                .find(
                    application =>
                        application.guildId ===
                            guildId &&
                        application.userId ===
                            interaction.user.id &&
                        (
                            application.status ===
                                "pending" ||
                            application.status ===
                                "changes_requested"
                        )
                );

        if (existing) {
            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Existing Application",
                        description:
                            "You already have an active application.",
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const applicationId =
            `${guildId}-${interaction.user.id}-${Date.now()}`;

        const data = {
            id:
                applicationId,
            guildId,
            userId:
                interaction.user.id,
            username:
                interaction.user.tag,
            realName:
                interaction.fields.getTextInputValue(
                    "real_name"
                ),
            robloxUsername:
                interaction.fields.getTextInputValue(
                    "roblox_username"
                ),
            age:
                interaction.fields.getTextInputValue(
                    "age"
                ),
            experience:
                interaction.fields.getTextInputValue(
                    "experience"
                ),
            reason:
                interaction.fields.getTextInputValue(
                    "reason"
                ),
            status:
                "pending",
            submittedAt:
                Date.now()
        };

        applications[
            applicationId
        ] = data;

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const category =
            guild.channels.cache.get(
                config.category
            );

        const staffRole =
            guild.roles.cache.get(
                config.staffRole
            );

        if (!category || !staffRole) {
            delete applications[
                applicationId
            ];

            saveJSON(
                APPLICATIONS_FILE,
                applications
            );

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Error",
                        description:
                            "The enrolment configuration is incomplete or one of the configured items no longer exists.",
                        footer:
                            "RSA Utility"
                    })
                ],
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
                .replace(
                    /^-|-$/g,
                    ""
                )
                .slice(0, 20) ||
            "applicant";

        const channel =
            await guild.channels.create({
                name:
                    `application-${safeName}`,
                type:
                    ChannelType.GuildText,
                parent:
                    category.id,
                topic:
                    `application-id:${applicationId}`,
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
                            interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id:
                            staffRole.id,
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

        data.channelId =
            channel.id;

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const applicationEmbed =
            createEmbed({
                title:
                    "Enrolment Application",
                description:
                    "A new enrolment application has been submitted.",
                fields: [
                    {
                        name:
                            "Applicant",
                        value:
                            `${interaction.user}\n\`${interaction.user.tag}\``
                    },
                    {
                        name:
                            "Name",
                        value:
                            data.realName
                    },
                    {
                        name:
                            "Roblox Username",
                        value:
                            data.robloxUsername
                    },
                    {
                        name:
                            "Age",
                        value:
                            data.age
                    },
                    {
                        name:
                            "Previous Experience",
                        value:
                            data.experience
                    },
                    {
                        name:
                            "Why should we accept you?",
                        value:
                            data.reason
                    },
                    {
                        name:
                            "Status",
                        value:
                            "Pending Review"
                    }
                ],
                footer:
                    `Application ID: ${applicationId}`
            });

        const reviewButtons =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `application_approve_${applicationId}`
                        )
                        .setLabel(
                            "Approve"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),
                    new ButtonBuilder()
                        .setCustomId(
                            `application_deny_${applicationId}`
                        )
                        .setLabel(
                            "Deny"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),
                    new ButtonBuilder()
                        .setCustomId(
                            `application_changes_${applicationId}`
                        )
                        .setLabel(
                            "Request Changes"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        await channel.send({
            content:
                `<@&${staffRole.id}>`,
            embeds: [
                applicationEmbed
            ],
            components: [
                reviewButtons
            ]
        });

        const reviewChannel =
            guild.channels.cache.get(
                config.reviewChannel
            );

        if (reviewChannel) {
            await reviewChannel.send({
                content:
                    `<@&${staffRole.id}>`,
                embeds: [
                    applicationEmbed
                ],
                components: [
                    reviewButtons
                ]
            }).catch(() => {});
        }

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Submitted",
                    description:
                        `Your enrolment application has been submitted successfully to **${guild.name}**.\n\nStaff will review your application and contact you through Discord.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       DENY APPLICATION
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "modal_deny_"
        )
    ) {
        const applicationId =
            interaction.customId.replace(
                "modal_deny_",
                ""
            );

        const application =
            applications[
                applicationId
            ];

        if (!application) {
            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        if (!isEnrolStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review applications.",
                ephemeral: true
            });
        }

        const reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        application.status =
            "denied";

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        application.reviewReason =
            reason;

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
                            "Enrolment Application Denied",
                        description:
                            `Your enrolment application for **${interaction.guild.name}** has been denied.`,
                        fields: [
                            {
                                name:
                                    "Reason",
                                value:
                                    reason
                            }
                        ],
                        footer:
                            "RSA Utility"
                    })
                ]
            }).catch(() => {});
        }

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Application",
                    description:
                        "This application has been **denied**.",
                    fields: [
                        {
                            name:
                                "Applicant",
                            value:
                                `<@${application.userId}>`
                        },
                        {
                            name:
                                "Denied By",
                            value:
                                interaction.user.toString()
                        },
                        {
                            name:
                                "Reason",
                            value:
                                reason
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: []
        });
    }

    /* =====================================================
       REQUEST CHANGES
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "modal_changes_"
        )
    ) {
        const applicationId =
            interaction.customId.replace(
                "modal_changes_",
                ""
            );

        const application =
            applications[
                applicationId
            ];

        if (!application) {
            return interaction.reply({
                content:
                    "Application not found.",
                ephemeral: true
            });
        }

        if (!isEnrolStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to review applications.",
                ephemeral: true
            });
        }

        const reason =
            interaction.fields.getTextInputValue(
                "reason"
            );

        application.status =
            "changes_requested";

        application.reviewedBy =
            interaction.user.id;

        application.reviewedAt =
            Date.now();

        application.reviewReason =
            reason;

        saveJSON(
            APPLICATIONS_FILE,
            applications
        );

        const applicant =
            await client.users.fetch(
                application.userId
            ).catch(() => null);

        if (applicant) {
            const button =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `enrol_resubmit_${application.guildId}`
                            )
                            .setLabel(
                                "Resubmit Enrolment"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            )
                    );

            await applicant.send({
                embeds: [
                    createEmbed({
                        title:
                            "Changes Requested",
                        description:
                            `Staff have requested changes to your enrolment application for **${interaction.guild.name}**.`,
                        fields: [
                            {
                                name:
                                    "Changes Required",
                                value:
                                    reason
                            }
                        ],
                        footer:
                            "RSA Utility"
                    })
                ],
                components: [
                    button
                ]
            }).catch(() => {});
        }

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Application",
                    description:
                        "Changes have been requested from the applicant.",
                    fields: [
                        {
                            name:
                                "Applicant",
                            value:
                                `<@${application.userId}>`
                        },
                        {
                            name:
                                "Requested By",
                            value:
                                interaction.user.toString()
                        },
                        {
                            name:
                                "Changes",
                            value:
                                reason
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: []
        });
    }

    /* =====================================================
       TICKET RENAME MODAL
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_rename"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        let name =
            interaction.fields
                .getTextInputValue(
                    "ticket_name"
                )
                .toLowerCase()
                .replace(
                    /[^a-z0-9-_]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                )
                .slice(0, 90);

        if (!name) {
            name = "ticket";
        }

        await interaction.channel.setName(
            name
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        "Ticket Renamed",
                    description:
                        `The ticket has been renamed to **${name}**.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET ADD USER
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_adduser"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields
                .getTextInputValue(
                    "user_id"
                )
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
                    title:
                        "User Added",
                    description:
                        `${member} has been added to this ticket.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET REMOVE USER
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_removeuser"
    ) {
        if (!isTicketStaff(interaction)) {
            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields
                .getTextInputValue(
                    "user_id"
                )
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

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

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
                    title:
                        "User Removed",
                    description:
                        `${member} has been removed from this ticket.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED MODALS
    ===================================================== */

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

    if (
        interaction.customId ===
        "modal_title"
    ) {
        session.title =
            interaction.fields
                .getTextInputValue("title");
    }

    else if (
        interaction.customId ===
        "modal_description"
    ) {
        session.description =
            interaction.fields
                .getTextInputValue("description");
    }

    else if (
        interaction.customId ===
        "modal_extra"
    ) {
        session.footer =
            interaction.fields
                .getTextInputValue("footer");

        session.image =
            interaction.fields
                .getTextInputValue("image");

        session.thumbnail =
            interaction.fields
                .getTextInputValue("thumbnail");
    }

    else if (
        interaction.customId ===
        "modal_field"
    ) {
        if (
            session.fields.length >=
            25
        ) {
            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 fields.",
                ephemeral: true
            });
        }

        const name =
            interaction.fields
                .getTextInputValue("name");

        const value =
            interaction.fields
                .getTextInputValue("value");

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
                title:
                    "Embed Updated",
                description:
                    "Your embed has been updated.",
                footer:
                    "RSA Utility"
            })
        ],
        ephemeral: true
    });
}

/* =========================================================
   SINGLE MODAL
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

    const maxLength =
        style ===
            TextInputStyle.Paragraph
            ? 4000
            : 256;

    const input =
        new TextInputBuilder()
            .setCustomId(inputId)
            .setLabel(label)
            .setStyle(style)
            .setRequired(false)
            .setMaxLength(maxLength);

    if (value) {
        input.setValue(
            value.slice(
                0,
                maxLength
            )
        );
    }

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(input)
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   TICKET HELPERS
========================================================= */

function getTicketOwner(
    channel
) {
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
   CLOSE TICKET
========================================================= */

async function closeTicket(
    interaction
) {
    const channel =
        interaction.channel;

    const ownerId =
        getTicketOwner(channel);

    await interaction.reply({
        embeds: [
            createEmbed({
                title:
                    "Ticket Closing",
                description:
                    "This ticket is being closed and a transcript will be saved.",
                footer:
                    "RSA Utility"
            })
        ]
    });

    const messages = [];

    try {
        let before;

        while (
            messages.length < 1000
        ) {
            const fetched =
                await channel.messages.fetch({
                    limit: 100,
                    ...(before
                        ? { before }
                        : {})
                });

            if (!fetched.size) {
                break;
            }

            messages.push(
                ...fetched.values()
            );

            before =
                fetched.last().id;

            if (
                fetched.size < 100
            ) {
                break;
            }
        }
    } catch (error) {
        console.error(
            "Transcript error:",
            error
        );
    }

    messages.sort(
        (a, b) =>
            a.createdTimestamp -
            b.createdTimestamp
    );

    let transcript =
        `${BOT_NAME} Ticket Transcript\n`;

    transcript +=
        `Server: ${interaction.guild.name}\n`;

    transcript +=
        `Channel: #${channel.name}\n`;

    transcript +=
        `Ticket Owner: ${ownerId || "Unknown"}\n`;

    transcript +=
        `Closed By: ${interaction.user.tag}\n`;

    transcript +=
        `Closed At: ${new Date().toISOString()}\n`;

    transcript +=
        `\n========================================\n\n`;

    for (
        const message of messages
    ) {
        const timestamp =
            new Date(
                message.createdTimestamp
            ).toISOString();

        const author =
            message.author?.tag ||
            "Unknown";

        let content =
            message.content ||
            "[No text content]";

        if (
            message.attachments.size
        ) {
            content +=
                ` | Attachments: ${[
                    ...message.attachments.values()
                ]
                    .map(
                        attachment =>
                            attachment.url
                    )
                    .join(", ")}`;
        }

        transcript +=
            `[${timestamp}] ${author}: ${content}\n`;
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
                "A ticket has been closed.",
            fields: [
                {
                    name:
                        "Ticket",
                    value:
                        `#${channel.name}`
                },
                {
                    name:
                        "Owner",
                    value:
                        ownerId
                            ? `<@${ownerId}>`
                            : "Unknown"
                },
                {
                    name:
                        "Closed By",
                    value:
                        interaction.user.toString()
                }
            ],
            footer:
                "RSA Utility"
        }),
        attachment
    );

    setTimeout(
        async () => {
            await channel.delete(
                `Ticket closed by ${interaction.user.tag}`
            ).catch(() => {});
        },
        1500
    );
}

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
