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
   RSA UTILITY CONFIG
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

const warnings = loadJSON(
    WARNINGS_FILE,
    {}
);

const configs = loadJSON(
    CONFIG_FILE,
    {}
);

/* =========================================================
   TEMPORARY SESSIONS
========================================================= */

const embedSessions = new Map();
const enrolSessions = new Map();

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
        embed.addFields(
            options.fields
        );
    }

    if (options.thumbnail) {
        embed.setThumbnail(
            options.thumbnail
        );
    }

    if (options.image) {
        embed.setImage(
            options.image
        );
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
        .setName("enrolschool")
        .setDescription(
            "Apply to enrol a school with the Roblox Schools Association."
        ),

    new SlashCommandBuilder()
        .setName("enrolconfig")
        .setDescription(
            "Configure the RSA Utility school enrolment system."
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
       ROLE MANAGEMENT
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
       ANNOUNCEMENTS
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
       EMBEDS
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

].map(command =>
    command.toJSON()
);

/* =========================================================
   COMMAND REGISTRATION
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
   ENROLMENT CONFIG
========================================================= */

function getEnrolConfig(guildId) {
    return configs[guildId]?.enrolment || null;
}

function isEnrolStaff(interaction) {
    const config =
        getEnrolConfig(
            interaction.guild.id
        );

    if (!config?.staffRole) {
        return (
            interaction.guild.ownerId ===
                interaction.user.id ||
            hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        );
    }

    return (
        interaction.guild.ownerId ===
            interaction.user.id ||
        hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageGuild
        ) ||
        interaction.member.roles.cache.has(
            config.staffRole
        )
    );
}

/* =========================================================
   ENROL CONFIG PANEL
========================================================= */

function enrolConfigEmbed(guild) {
    const config =
        getEnrolConfig(guild.id);

    return createEmbed({
        title: "School Enrolment Configuration",
        description:
            "Use the controls below to configure the RSA Utility school enrolment system.\n\nWhen an applicant submits an enrolment, RSA Utility will automatically create a private review channel inside the configured category. You do not need to select a review channel.",
        fields: [
            {
                name: "Review Category",
                value:
                    config?.category
                        ? `<#${config.category}>`
                        : "Not configured",
                inline: true
            },
            {
                name: "Staff Role",
                value:
                    config?.staffRole
                        ? `<@&${config.staffRole}>`
                        : "Not configured",
                inline: true
            },
            {
                name: "Automatic Review Channels",
                value:
                    config?.category &&
                    config?.staffRole
                        ? "Enabled"
                        : "Waiting for configuration",
                inline: false
            }
        ],
        footer:
            "RSA Utility • School Enrolment"
    });
}

function enrolConfigButtons() {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_category"
                    )
                    .setLabel(
                        "Set Review Category"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_staff"
                    )
                    .setLabel(
                        "Set Staff Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            ),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_config_disable"
                    )
                    .setLabel(
                        "Disable Enrolment"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            )
    ];
}

/* =========================================================
   ENROLMENT QUESTIONNAIRE
========================================================= */

function enrolQuestionnaireEmbed() {
    return createEmbed({
        title: "RSA School Enrolment",
        description:
            "Thank you for your interest in enrolling your school with the Roblox Schools Association.\n\nClick the button below to complete the private questionnaire.\n\nYour answers will only be sent to the RSA enrolment staff for review.",
        fields: [
            {
                name: "Questions",
                value:
                    "1. School Name\n2. School Description\n3. School Discord Invite\n4. School Owner\n5. School Type\n6. Why should your school be accepted?"
            }
        ],
        footer:
            "RSA Utility • School Enrolment"
    });
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
                    title: "RSA Utility",
                    description:
                        "A complete moderation, management, support and school enrolment utility for the Roblox Schools Association.",
                    fields: [
                        {
                            name: "Information",
                            value:
                                "`/ping` `/botinfo` `/serverinfo` `/userinfo`"
                        },
                        {
                            name: "School Enrolment",
                            value:
                                "`/enrolschool` `/enrolconfig`"
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
                        "RSA Utility provides moderation, management, information, support and school enrolment tools.",
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
       ENROL SCHOOL
    ===================================================== */

    if (command === "enrolschool") {

        const config =
            getEnrolConfig(
                interaction.guild.id
            );

        if (
            !config?.category ||
            !config?.staffRole
        ) {
            return interaction.reply({
                content:
                    "The school enrolment system has not been configured yet.",
                ephemeral: true
            });
        }

        const alreadyApplying =
            [...enrolSessions.values()]
                .some(
                    session =>
                        session.guildId ===
                            interaction.guild.id &&
                        session.userId ===
                            interaction.user.id
                );

        if (alreadyApplying) {
            return interaction.reply({
                content:
                    "You already have an enrolment questionnaire in progress. Please check your DMs.",
                ephemeral: true
            });
        }

        const session = {
            userId:
                interaction.user.id,
            guildId:
                interaction.guild.id,
            answers: {}
        };

        enrolSessions.set(
            interaction.user.id,
            session
        );

        try {

            await interaction.user.send({
                embeds: [
                    enrolQuestionnaireEmbed()
                ],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(
                                    `enrol_start:${interaction.user.id}`
                                )
                                .setLabel(
                                    "Start Questionnaire"
                                )
                                .setStyle(
                                    ButtonStyle.Primary
                                )
                        )
                ]
            });

        } catch (error) {

            enrolSessions.delete(
                interaction.user.id
            );

            return interaction.reply({
                content:
                    "I couldn't send you a DM. Please enable DMs from server members and try again.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content:
                "I've sent the enrolment questionnaire to your DMs.",
            ephemeral: true
        });
    }

    /* =====================================================
       ENROL CONFIG
    ===================================================== */

    if (command === "enrolconfig") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission to configure school enrolments.",
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [
                enrolConfigEmbed(
                    interaction.guild
                )
            ],
            components:
                enrolConfigButtons(),
            ephemeral: true
        });
    }

    /* =====================================================
       BAN
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
                    "You cannot ban this member because of the role hierarchy.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(
            user.id,
            {
                reason
            }
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
                            value:
                                reason
                        },
                        {
                            name: "Moderator",
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
                    "You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(
            reason
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Member Kicked",
                    description:
                        `**${user.tag}** has been kicked.`,
                    fields: [
                        {
                            name: "Reason",
                            value:
                                reason
                        },
                        {
                            name: "Moderator",
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
                            value:
                                reason
                        },
                        {
                            name: "Moderator",
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
                            value:
                                reason
                        },
                        {
                            name: "Moderator",
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
            interaction.options.getUser(
                "user"
            );

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
                        footer:
                            "RSA Utility"
                    })
                ],
                ephemeral: true
            });
        }

        const description =
            list
                .map(
                    (item, index) =>
                        `**${index + 1}.** ${item.reason}\nModerator: <@${item.moderator}>\n<t:${Math.floor(item.timestamp / 1000)}:R>`
                )
                .join("\n\n");

        return interaction.reply({
            embeds: [
                createEmbed({
                    title:
                        `Warnings — ${user.tag}`,
                    description:
                        description.slice(
                            0,
                            4000
                        ),
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
            interaction.options.getUser(
                "user"
            );

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
                    title: "Warnings Cleared",
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
            interaction.options.getInteger(
                "amount"
            );

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
                SendMessages: false
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Channel Locked",
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
                SendMessages: null
            }
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Channel Unlocked",
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
            interaction.options.getInteger(
                "seconds"
            );

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

            await member.roles.add(
                role
            );

            return interaction.reply({
                embeds: [
                    createEmbed({
                        title: "Role Added",
                        description:
                            `Added ${role} to **${user.tag}**.`,
                        footer:
                            "RSA Utility"
                    })
                ]
            });
        }

        await member.roles.remove(
            role
        );

        return interaction.reply({
            embeds: [
                createEmbed({
                    title: "Role Removed",
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
            interaction.options.getString(
                "title"
            );

        const message =
            interaction.options.getString(
                "message"
            );

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
                    title: "Announcement Sent",
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
            interaction.options.getChannel(
                "category"
            );

        const panel =
            interaction.options.getChannel(
                "panel"
            );

        const logs =
            interaction.options.getChannel(
                "logs"
            );

        const support =
            interaction.options.getRole(
                "support"
            );

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
                    fields: [
                        {
                            name: "Category",
                            value:
                                category.toString()
                        },
                        {
                            name: "Panel Channel",
                            value:
                                panel.toString()
                        },
                        {
                            name: "Logs Channel",
                            value:
                                logs.toString()
                        },
                        {
                            name: "Support Role",
                            value:
                                support.toString()
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
       TICKET CONFIG
    ===================================================== */

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
                            name: "Category",
                            value:
                                `<#${ticket.category}>`
                        },
                        {
                            name: "Panel Channel",
                            value:
                                `<#${ticket.panelChannel}>`
                        },
                        {
                            name: "Logs Channel",
                            value:
                                `<#${ticket.logsChannel}>`
                        },
                        {
                            name: "Support Role",
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
   EMBED BUILDER
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
            buildCreatorEmbed(
                session
            )
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
   BUTTON HANDLER
========================================================= */

async function handleButton(
    interaction
) {

    /* =====================================================
       ENROL START
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "enrol_start:"
        )
    ) {

        const userId =
            interaction.customId.split(":")[1];

        if (
            userId !==
            interaction.user.id
        ) {
            return interaction.reply({
                content:
                    "This questionnaire belongs to another user.",
                ephemeral: true
            });
        }

        const session =
            enrolSessions.get(
                interaction.user.id
            );

        if (!session) {
            return interaction.reply({
                content:
                    "Your enrolment session has expired. Please run `/enrolschool` again.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_enrol_questionnaire"
                )
                .setTitle(
                    "School Enrolment"
                );

        const schoolName =
            new TextInputBuilder()
                .setCustomId(
                    "school_name"
                )
                .setLabel(
                    "What is your School's Name?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const description =
            new TextInputBuilder()
                .setCustomId(
                    "school_description"
                )
                .setLabel(
                    "Description for your school?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        const invite =
            new TextInputBuilder()
                .setCustomId(
                    "school_invite"
                )
                .setLabel(
                    "School's Discord Server Invite?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(200);

        const owner =
            new TextInputBuilder()
                .setCustomId(
                    "school_owner"
                )
                .setLabel(
                    "Who owns/runs the school?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const type =
            new TextInputBuilder()
                .setCustomId(
                    "school_type"
                )
                .setLabel(
                    "What type of school is it?"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(100);

        const why =
            new TextInputBuilder()
                .setCustomId(
                    "school_reason"
                )
                .setLabel(
                    "Why should RSA accept your school?"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    schoolName
                ),
            new ActionRowBuilder()
                .addComponents(
                    description
                ),
            new ActionRowBuilder()
                .addComponents(
                    invite
                ),
            new ActionRowBuilder()
                .addComponents(
                    owner
                ),
            new ActionRowBuilder()
                .addComponents(
                    type
                ),
            new ActionRowBuilder()
                .addComponents(
                    why
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       ENROL CONFIG CATEGORY
    ===================================================== */

    if (
        interaction.customId ===
        "enrol_config_category"
    ) {

        if (
            !isEnrolConfigManager(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_enrol_category"
                )
                .setTitle(
                    "Set Review Category"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "category_id"
                )
                .setLabel(
                    "Category Channel ID"
                )
                .setPlaceholder(
                    "Example: 123456789012345678"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       ENROL CONFIG STAFF
    ===================================================== */

    if (
        interaction.customId ===
        "enrol_config_staff"
    ) {

        if (
            !isEnrolConfigManager(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_enrol_staff"
                )
                .setTitle(
                    "Set Enrolment Staff Role"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "staff_role_id"
                )
                .setLabel(
                    "Staff Role ID"
                )
                .setPlaceholder(
                    "Example: 123456789012345678"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(25);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       ENROL CONFIG REFRESH
    ===================================================== */

    if (
        interaction.customId ===
        "enrol_config_refresh"
    ) {

        if (
            !isEnrolConfigManager(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        return interaction.update({
            embeds: [
                enrolConfigEmbed(
                    interaction.guild
                )
            ],
            components:
                enrolConfigButtons()
        });
    }

    /* =====================================================
       ENROL CONFIG DISABLE
    ===================================================== */

    if (
        interaction.customId ===
        "enrol_config_disable"
    ) {

        if (
            !isEnrolConfigManager(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        if (
            configs[
                interaction.guild.id
            ]
        ) {
            delete configs[
                interaction.guild.id
            ].enrolment;
        }

        saveJSON(
            CONFIG_FILE,
            configs
        );

        return interaction.update({
            embeds: [
                enrolConfigEmbed(
                    interaction.guild
                )
            ],
            components:
                enrolConfigButtons()
        });
    }

    /* =====================================================
       ENROL REVIEW ACTIONS
    ===================================================== */

    if (
        interaction.customId ===
        "enrol_approve"
    ) {
        return handleEnrolDecision(
            interaction,
            "approved"
        );
    }

    if (
        interaction.customId ===
        "enrol_deny"
    ) {
        return showEnrolDecisionModal(
            interaction,
            "denied"
        );
    }

    if (
        interaction.customId ===
        "enrol_changes"
    ) {
        return showEnrolDecisionModal(
            interaction,
            "changes"
        );
    }

    /* =====================================================
       TICKET SYSTEM
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_create"
    ) {
        return handleTicketCreate(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_claim"
    ) {
        return handleTicketClaim(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_unclaim"
    ) {
        return handleTicketUnclaim(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_close"
    ) {

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        if (
            !isTicketStaff(
                interaction
            ) &&
            ownerId !==
                interaction.user.id
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

    if (
        interaction.customId ===
        "ticket_modpanel"
    ) {
        return ticketModPanel(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_rename"
    ) {
        return ticketRename(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_adduser"
    ) {
        return ticketAddUser(
            interaction
        );
    }

    if (
        interaction.customId ===
        "ticket_removeuser"
    ) {
        return ticketRemoveUser(
            interaction
        );
    }

    /* =====================================================
       EMBED BUTTONS
    ===================================================== */

    if (
        !interaction.customId.startsWith(
            "embed_"
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
                    session.footer ||
                        ""
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
                    session.image ||
                        ""
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
                    session.thumbnail ||
                        ""
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    footer
                ),
            new ActionRowBuilder()
                .addComponents(
                    image
                ),
            new ActionRowBuilder()
                .addComponents(
                    thumbnail
                )
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
                .addComponents(
                    name
                ),
            new ActionRowBuilder()
                .addComponents(
                    value
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

/* =========================================================
   ENROLMENT CONFIG MANAGER
========================================================= */

function isEnrolConfigManager(
    interaction
) {
    return hasPermission(
        interaction,
        PermissionsBitField.Flags.ManageGuild
    );
}

/* =========================================================
   ENROLMENT DECISION MODAL
========================================================= */

async function showEnrolDecisionModal(
    interaction,
    decision
) {

    if (
        !isEnrolStaff(
            interaction
        )
    ) {
        return interaction.reply({
            content:
                "You do not have permission to review enrolments.",
            ephemeral: true
        });
    }

    const modal =
        new ModalBuilder()
            .setCustomId(
                `modal_enrol_decision:${decision}`
            )
            .setTitle(
                decision === "denied"
                    ? "Deny Enrolment"
                    : "Request Changes"
            );

    const reason =
        new TextInputBuilder()
            .setCustomId(
                "reason"
            )
            .setLabel(
                decision === "denied"
                    ? "Reason for denial"
                    : "Changes required"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(true)
            .setMaxLength(1000);

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                reason
            )
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   ENROLMENT DECISION
========================================================= */

async function handleEnrolDecision(
    interaction,
    decision,
    reason = null
) {

    if (
        !isEnrolStaff(
            interaction
        )
    ) {
        return interaction.reply({
            content:
                "You do not have permission to review enrolments.",
            ephemeral: true
        });
    }

    const application =
        getApplicationFromChannel(
            interaction.channel
        );

    if (!application) {
        return interaction.reply({
            content:
                "This is not a valid RSA enrolment review channel.",
            ephemeral: true
        });
    }

    if (
        decision === "approved"
    ) {

        await notifyApplicant(
            application.userId,
            {
                title:
                    "School Enrolment Approved",
                description:
                    `Your school enrolment application for **${application.schoolName}** has been **approved** by the Roblox Schools Association.`,
                fields: [
                    {
                        name:
                            "Reviewed By",
                        value:
                            interaction.user.toString()
                    }
                ]
            }
        );

    } else if (
        decision === "denied"
    ) {

        await notifyApplicant(
            application.userId,
            {
                title:
                    "School Enrolment Denied",
                description:
                    `Your school enrolment application for **${application.schoolName}** has been **denied**.`,
                fields: [
                    {
                        name:
                            "Reason",
                        value:
                            reason ||
                            "No reason provided."
                    }
                ]
            }
        );

    } else {

        await notifyApplicant(
            application.userId,
            {
                title:
                    "Changes Requested",
                description:
                    `RSA Utility has requested changes to your school enrolment application for **${application.schoolName}**.`,
                fields: [
                    {
                        name:
                            "Changes Required",
                        value:
                            reason ||
                            "No changes specified."
                    }
                ]
            }
        );
    }

    const updatedEmbed =
        createEmbed({
            title:
                decision === "approved"
                    ? "Enrolment Approved"
                    : decision === "denied"
                        ? "Enrolment Denied"
                        : "Changes Requested",
            description:
                `This school enrolment has been **${decision}**.`,
            fields: [
                {
                    name:
                        "School",
                    value:
                        application.schoolName
                },
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
                ...(reason
                    ? [
                        {
                            name:
                                decision === "denied"
                                    ? "Reason"
                                    : "Changes Required",
                            value:
                                reason
                        }
                    ]
                    : [])
            ],
            footer:
                "RSA Utility • School Enrolment"
        });

    const disabledRow =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "enrol_approved_done"
                    )
                    .setLabel(
                        decision === "approved"
                            ? "Approved"
                            : decision === "denied"
                                ? "Denied"
                                : "Changes Requested"
                    )
                    .setStyle(
                        decision === "approved"
                            ? ButtonStyle.Success
                            : decision === "denied"
                                ? ButtonStyle.Danger
                                : ButtonStyle.Primary
                    )
                    .setDisabled(true)
            );

    await interaction.update({
        embeds: [
            updatedEmbed
        ],
        components: [
            disabledRow
        ]
    });

    if (
        decision === "approved" ||
        decision === "denied"
    ) {

        setTimeout(
            async () => {
                await interaction.channel
                    .delete(
                        `Enrolment ${decision}`
                    )
                    .catch(() => {});
            },
            5000
        );
    }
}

/* =========================================================
   APPLICATION CHANNEL
========================================================= */

async function createEnrolmentChannel(
    guild,
    session
) {

    const config =
        getEnrolConfig(
            guild.id
        );

    if (
        !config?.category ||
        !config?.staffRole
    ) {
        throw new Error(
            "Enrolment system is not configured."
        );
    }

    const category =
        guild.channels.cache.get(
            config.category
        );

    const staffRole =
        guild.roles.cache.get(
            config.staffRole
        );

    if (!category) {
        throw new Error(
            "Configured review category does not exist."
        );
    }

    if (!staffRole) {
        throw new Error(
            "Configured enrolment staff role does not exist."
        );
    }

    const applicant =
        await guild.members.fetch(
            session.userId
        ).catch(() => null);

    const baseName =
        session.answers.schoolName ||
        applicant?.user.username ||
        "application";

    const safeName =
        baseName
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
            .slice(
                0,
                70
            ) ||
        "application";

    const channel =
        await guild.channels.create({
            name:
                `enrol-${safeName}`,
            type:
                ChannelType.GuildText,
            parent:
                category.id,
            topic:
                `rsa-enrolment:${session.userId}`,
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
                        PermissionsBitField.Flags.ReadMessageHistory,
                        PermissionsBitField.Flags.ManageMessages
                    ]
                },
                {
                    id:
                        session.userId,
                    deny: [
                        PermissionsBitField.Flags.ViewChannel
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

    const applicantName =
        applicant?.user?.tag ||
        session.userId;

    const reviewEmbed =
        createEmbed({
            title:
                "School Enrolment Application",
            description:
                "A new school enrolment application has been submitted and is ready for staff review.",
            fields: [
                {
                    name:
                        "School Name",
                    value:
                        session.answers.schoolName
                },
                {
                    name:
                        "School Description",
                    value:
                        session.answers.schoolDescription
                },
                {
                    name:
                        "Discord Server Invite",
                    value:
                        session.answers.schoolInvite
                },
                {
                    name:
                        "School Owner",
                    value:
                        session.answers.schoolOwner
                },
                {
                    name:
                        "School Type",
                    value:
                        session.answers.schoolType
                },
                {
                    name:
                        "Why should RSA accept this school?",
                    value:
                        session.answers.schoolReason
                },
                {
                    name:
                        "Applicant",
                    value:
                        `${applicantName} (<@${session.userId}>)`
                },
                {
                    name:
                        "Status",
                    value:
                        "Pending Review"
                }
            ],
            footer:
                "RSA Utility • School Enrolment"
        });

    const buttons =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "enrol_approve"
                    )
                    .setLabel(
                        "Approve"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_changes"
                    )
                    .setLabel(
                        "Request Changes"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "enrol_deny"
                    )
                    .setLabel(
                        "Deny"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    await channel.send({
        content:
            `<@&${staffRole.id}>`,
        embeds: [
            reviewEmbed
        ],
        components: [
            buttons
        ]
    });

    return channel;
}

/* =========================================================
   APPLICATION LOOKUP
========================================================= */

function getApplicationFromChannel(
    channel
) {

    if (!channel?.topic) {
        return null;
    }

    const match =
        channel.topic.match(
            /rsa-enrolment:(\d+)/
        );

    if (!match) {
        return null;
    }

    const application =
        channel.messages.cache
            .find(() => false);

    return {
        userId:
            match[1],
        schoolName:
            channel.name
                .replace(
                    /^enrol-/,
                    ""
                )
    };
}

/* =========================================================
   APPLICANT DM
========================================================= */

async function notifyApplicant(
    userId,
    data
) {

    try {

        const user =
            await client.users.fetch(
                userId
            );

        await user.send({
            embeds: [
                createEmbed(data)
            ]
        });

    } catch (error) {

        console.error(
            "Could not DM applicant:",
            error
        );
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
            .setCustomId(
                customId
            )
            .setTitle(
                modalTitle
            );

    const maxLength =
        style ===
            TextInputStyle.Paragraph
            ? 4000
            : 256;

    const input =
        new TextInputBuilder()
            .setCustomId(
                inputId
            )
            .setLabel(
                label
            )
            .setStyle(
                style
            )
            .setRequired(false)
            .setMaxLength(
                maxLength
            );

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
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(
    interaction
) {

    /* =====================================================
       ENROL QUESTIONNAIRE
    ===================================================== */

    if (
        interaction.customId ===
        "modal_enrol_questionnaire"
    ) {

        const session =
            enrolSessions.get(
                interaction.user.id
            );

        if (!session) {
            return interaction.reply({
                content:
                    "Your enrolment session has expired. Please run `/enrolschool` again.",
                ephemeral: true
            });
        }

        session.answers = {
            schoolName:
                interaction.fields.getTextInputValue(
                    "school_name"
                ),
            schoolDescription:
                interaction.fields.getTextInputValue(
                    "school_description"
                ),
            schoolInvite:
                interaction.fields.getTextInputValue(
                    "school_invite"
                ),
            schoolOwner:
                interaction.fields.getTextInputValue(
                    "school_owner"
                ),
            schoolType:
                interaction.fields.getTextInputValue(
                    "school_type"
                ),
            schoolReason:
                interaction.fields.getTextInputValue(
                    "school_reason"
                )
        };

        const submitEmbed =
            createEmbed({
                title:
                    "Review Your Enrolment",
                description:
                    "Your questionnaire has been completed. Please review your answers below. If everything is correct, press **Submit Enrolment**.",
                fields: [
                    {
                        name:
                            "School Name",
                        value:
                            session.answers.schoolName
                    },
                    {
                        name:
                            "Description",
                        value:
                            session.answers.schoolDescription
                    },
                    {
                        name:
                            "Discord Invite",
                        value:
                            session.answers.schoolInvite
                    },
                    {
                        name:
                            "School Owner",
                        value:
                            session.answers.schoolOwner
                    },
                    {
                        name:
                            "School Type",
                        value:
                            session.answers.schoolType
                    },
                    {
                        name:
                            "Reason",
                        value:
                            session.answers.schoolReason
                    }
                ],
                footer:
                    "RSA Utility • School Enrolment"
            });

        return interaction.reply({
            embeds: [
                submitEmbed
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                "enrol_submit"
                            )
                            .setLabel(
                                "Submit Enrolment"
                            )
                            .setStyle(
                                ButtonStyle.Success
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "enrol_cancel"
                            )
                            .setLabel(
                                "Cancel"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    )
            ]
        });
    }

    /* =====================================================
       ENROL CATEGORY
    ===================================================== */

    if (
        interaction.customId ===
        "modal_enrol_category"
    ) {

        if (
            !isEnrolConfigManager(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const categoryId =
            interaction.fields
                .getTextInputValue(
                    "category_id"
                )
                .trim();

        const category =
            interaction.guild.channels.cache.get(
                categoryId
            );

        if (
            !category ||
            category.type !==
                ChannelType.GuildCategory
        ) {
            return interaction.reply({
                content:
                    "That ID is not a valid category in this server.",
                ephemeral: true
            });
        }

        configs[
            interaction.guild.id
        ] = {
            ...(
                configs[
                    interaction.guild.id
                ] || {}
            ),
            enrolment: {
                ...(
                    configs[
                        interaction.guild.id
                    ]?.enrolment || {}
                ),
                category:
                    category.id
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
                        "Review Category Updated",
                    description:
                        `New enrolment review channels will automatically be created in ${category}.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ENROL STAFF
    ===================================================== */

    if (
        interaction.customId ===
        "modal_enrol_staff"
    ) {

        if (
            !isEnrolConfigManager(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const roleId =
            interaction.fields
                .getTextInputValue(
                    "staff_role_id"
                )
                .trim();

        const role =
            interaction.guild.roles.cache.get(
                roleId
            );

        if (!role) {
            return interaction.reply({
                content:
                    "That role could not be found in this server.",
                ephemeral: true
            });
        }

        configs[
            interaction.guild.id
        ] = {
            ...(
                configs[
                    interaction.guild.id
                ] || {}
            ),
            enrolment: {
                ...(
                    configs[
                        interaction.guild.id
                    ]?.enrolment || {}
                ),
                staffRole:
                    role.id
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
                        "Enrolment Staff Updated",
                    description:
                        `${role} is now the staff role for school enrolment reviews.`,
                    footer:
                        "RSA Utility"
                })
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       ENROL DECISION MODAL
    ===================================================== */

    if (
        interaction.customId.startsWith(
            "modal_enrol_decision:"
        )
    ) {

        const decision =
            interaction.customId.split(":")[1];

        const reason =
            interaction.fields
                .getTextInputValue(
                    "reason"
                );

        return handleEnrolDecision(
            interaction,
            decision,
            reason
        );
    }

    /* =====================================================
       TICKET RENAME
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_rename"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
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
                .slice(
                    0,
                    90
                );

        if (!name) {
            name = "ticket";
        }

        await interaction.channel.setName(
            name
        );

        return interaction.reply({
            content:
                `Ticket renamed to **${name}**.`,
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

        if (
            !isTicketStaff(
                interaction
            )
        ) {
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
            content:
                `${member} has been added to this ticket.`,
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

        if (
            !isTicketStaff(
                interaction
            )
        ) {
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

        if (
            ownerId ===
            member.id
        ) {
            return interaction.reply({
                content:
                    "The ticket owner cannot be removed from their own ticket.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.delete(
            member.id
        ).catch(() => {});

        return interaction.reply({
            content:
                `${member} has been removed from this ticket.`,
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
                .getTextInputValue(
                    "title"
                );

    } else if (
        interaction.customId ===
        "modal_description"
    ) {

        session.description =
            interaction.fields
                .getTextInputValue(
                    "description"
                );

    } else if (
        interaction.customId ===
        "modal_extra"
    ) {

        session.footer =
            interaction.fields
                .getTextInputValue(
                    "footer"
                );

        session.image =
            interaction.fields
                .getTextInputValue(
                    "image"
                );

        session.thumbnail =
            interaction.fields
                .getTextInputValue(
                    "thumbnail"
                );

    } else if (
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
                .getTextInputValue(
                    "name"
                );

        const value =
            interaction.fields
                .getTextInputValue(
                    "value"
                );

        session.fields.push({
            name,
            value,
            inline: false
        });

    } else {

        return;
    }

    await interaction.reply({
        content:
            "Embed updated.",
        ephemeral: true
    });
}

/* =========================================================
   ENROL SUBMISSION BUTTONS
========================================================= */

async function handleEnrolSubmit(
    interaction
) {

    const session =
        enrolSessions.get(
            interaction.user.id
        );

    if (!session) {
        return interaction.reply({
            content:
                "Your enrolment session has expired. Please run `/enrolschool` again.",
            ephemeral: true
        });
    }

    const guild =
        await client.guilds.fetch(
            session.guildId
        ).catch(() => null);

    if (!guild) {
        return interaction.reply({
            content:
                "The original RSA server could not be found.",
            ephemeral: true
        });
    }

    try {

        const channel =
            await createEnrolmentChannel(
                guild,
                session
            );

        enrolSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            embeds: [
                createEmbed({
                    title:
                        "Enrolment Submitted",
                    description:
                        "Your school enrolment has been submitted successfully.\n\nRSA staff will review your application. You will receive a DM when a decision has been made.",
                    fields: [
                        {
                            name:
                                "School",
                            value:
                                session.answers.schoolName
                        },
                        {
                            name:
                                "Status",
                            value:
                                "Pending Review"
                        }
                    ],
                    footer:
                        "RSA Utility"
                })
            ],
            components: []
        });

    } catch (error) {

        console.error(
            "Enrolment submission error:",
            error
        );

        return interaction.update({
            content:
                "I couldn't submit your enrolment. Please contact RSA staff.",
            embeds: [],
            components: []
        });
    }
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

function isTicketStaff(
    interaction
) {

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

/* =========================================================
   TICKET CREATE
========================================================= */

async function handleTicketCreate(
    interaction
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
            ) ||
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
                    `Welcome ${interaction.user}.\n\nPlease explain your enquiry clearly and provide any relevant information.`,
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

    return interaction.editReply({
        content:
            `Your ticket has been created: ${channel}`
    });
}

/* =========================================================
   TICKET CLAIM
========================================================= */

async function handleTicketClaim(
    interaction
) {

    if (
        !isTicketStaff(
            interaction
        )
    ) {
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
                        ? `Welcome <@${ownerId}>.\n\nA member of the support team is handling this ticket.`
                        : "Support ticket.",
                fields: [
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

/* =========================================================
   TICKET UNCLAIM
========================================================= */

async function handleTicketUnclaim(
    interaction
) {

    if (
        !isTicketStaff(
            interaction
        )
    ) {
        return interaction.reply({
            content:
                "You do not have permission to unclaim tickets.",
            ephemeral: true
        });
    }

    return interaction.update({
        embeds: [
            createEmbed({
                title:
                    "Support Ticket",
                description:
                    "This ticket is currently unclaimed.",
                fields: [
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

/* =========================================================
   TICKET MOD PANEL
========================================================= */

async function ticketModPanel(
    interaction
) {

    if (
        !isTicketStaff(
            interaction
        )
    ) {
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

/* =========================================================
   TICKET RENAME
========================================================= */

async function ticketRename(
    interaction
) {

    if (
        !isTicketStaff(
            interaction
        )
    ) {
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
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   TICKET ADD USER
========================================================= */

async function ticketAddUser(
    interaction
) {

    if (
        !isTicketStaff(
            interaction
        )
    ) {
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
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
}

/* =========================================================
   TICKET REMOVE USER
========================================================= */

async function ticketRemoveUser(
    interaction
) {

    if (
        !isTicketStaff(
            interaction
        )
    ) {
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
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
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
        getTicketOwner(
            channel
        );

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
            messages.length <
            1000
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
                fetched.size <
                100
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
        `Closed At: ${new Date().toISOString()}\n\n`;

    transcript +=
        "========================================\n\n";

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

    const config =
        configs[
            interaction.guild.id
        ]?.ticket;

    if (config?.logsChannel) {

        const logs =
            interaction.guild.channels.cache.get(
                config.logsChannel
            );

        if (logs) {
            await logs.send({
                embeds: [
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
                    })
                ],
                files: [
                    attachment
                ]
            }).catch(() => {});
        }
    }

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
   ENROL SUBMIT/CANCEL
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
            interaction.customId ===
            "enrol_submit"
        ) {

            try {
                await handleEnrolSubmit(
                    interaction
                );
            } catch (error) {
                console.error(
                    "Enrol submission error:",
                    error
                );
            }

            return;
        }

        if (
            interaction.customId ===
            "enrol_cancel"
        ) {

            enrolSessions.delete(
                interaction.user.id
            );

            return interaction.update({
                embeds: [
                    createEmbed({
                        title:
                            "Enrolment Cancelled",
                        description:
                            "Your school enrolment has been cancelled.",
                        footer:
                            "RSA Utility"
                    })
                ],
                components: []
            });
        }
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

client.login(
    TOKEN
);
