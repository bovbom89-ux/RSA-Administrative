require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const EMBED_COLOR = "#E75D2A";

// ======================================================
// COMMANDS
// ======================================================

const commands = [
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Permanently ban a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to ban.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("The reason for the ban.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(option =>
            option
                .setName("userid")
                .setDescription("The ID of the user to unban.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Remove a member from the server.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to kick.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("The reason for the kick.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Temporarily restrict a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to timeout.")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Timeout duration in minutes.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("The reason for the timeout.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to untimeout.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to warn.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("The reason for the warning.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete multiple messages.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete recent messages.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode duration in seconds. Use 0 to disable.")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel."),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel."),

    new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Lock configured server channels."),

    new SlashCommandBuilder()
        .setName("unlockdown")
        .setDescription("End the server lockdown."),

    new SlashCommandBuilder()
        .setName("automodconfig")
        .setDescription("Configure Ghosty's AutoMod system."),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configure Ghosty's logging system."),

    new SlashCommandBuilder()
        .setName("logsstatus")
        .setDescription("View the current logging settings."),

    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Set up Ghosty for this server."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Manage Ghosty's settings."),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View information about a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View information about the server."),

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View information about a role.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("The role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View information about a channel."),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a member's avatar.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("banner")
        .setDescription("View a member's banner.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member.")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Open the Ghosty staff panel."),

    new SlashCommandBuilder()
        .setName("modstats")
        .setDescription("View moderation statistics."),

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("View Ghosty's commands."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check Ghosty's latency."),

    new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("View Ghosty's uptime."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View information about Ghosty."),

    new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get Ghosty's invite link."),

    new SlashCommandBuilder()
        .setName("support")
        .setDescription("Get the Ghosty support server.")
].map(command => command.toJSON());

// ======================================================
// EMBED FUNCTION
// ======================================================

function createEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description);
}

// ======================================================
// REGISTER COMMANDS
// ======================================================

async function registerCommands() {
    try {
        console.log("Registering Ghosty commands...");

        const rest = new REST({ version: "10" }).setToken(
            process.env.DISCORD_TOKEN
        );

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );

        console.log(`Registered ${commands.length} Ghosty commands.`);
    } catch (error) {
        console.error("Command registration failed:", error);
    }
}

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {
    console.log(`Ghosty is online as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} server(s).`);

    await registerCommands();
});

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
        }

        if (interaction.isButton()) {
            await handleButton(interaction);
        }
    } catch (error) {
        console.error(error);

        const reply = {
            embeds: [
                createEmbed(
                    "Something went wrong",
                    "Ghosty could not complete that action."
                )
            ],
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
});

// ======================================================
// COMMAND HANDLER
// ======================================================

async function handleCommand(interaction) {
    const command = interaction.commandName;

    // -------------------------------
    // BAN
    // -------------------------------

    if (command === "ban") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Permission Denied",
                        "You need the Ban Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "No reason provided.";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Member Not Found",
                        "That user is not currently in this server."
                    )
                ],
                ephemeral: true
            });
        }

        if (!member.bannable) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Unable to Ban",
                        "Ghosty cannot ban that member. Check role hierarchy and permissions."
                    )
                ],
                ephemeral: true
            });
        }

        await member.ban({ reason });

        return interaction.reply({
            embeds: [
                createEmbed(
                    "Member Banned",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // KICK
    // -------------------------------

    if (command === "kick") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Permission Denied",
                        "You need the Kick Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "No reason provided.";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.kickable) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Unable to Kick",
                        "Ghosty cannot kick that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.kick(reason);

        return interaction.reply({
            embeds: [
                createEmbed(
                    "Member Kicked",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // TIMEOUT
    // -------------------------------

    if (command === "timeout") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Permission Denied",
                        "You need the Moderate Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const minutes = interaction.options.getInteger("minutes");
        const reason =
            interaction.options.getString("reason") || "No reason provided.";

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.moderatable) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Unable to Timeout",
                        "Ghosty cannot timeout that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(minutes * 60 * 1000, reason);

        return interaction.reply({
            embeds: [
                createEmbed(
                    "Member Timed Out",
                    `**User:** ${user}\n**Duration:** ${minutes} minute(s)\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // UNTIMEOUT
    // -------------------------------

    if (command === "untimeout") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Permission Denied",
                        "You need the Moderate Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member || !member.moderatable) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Unable to Remove Timeout",
                        "Ghosty cannot modify that member."
                    )
                ],
                ephemeral: true
            });
        }

        await member.timeout(null);

        return interaction.reply({
            embeds: [
                createEmbed(
                    "Timeout Removed",
                    `The timeout has been removed from **${user}**.`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // WARN
    // -------------------------------

    if (command === "warn") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Permission Denied",
                        "You need the Moderate Members permission to use this command."
                    )
                ],
                ephemeral: true
            });
        }

        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");

        return interaction.reply({
            embeds: [
                createEmbed(
                    "Member Warned",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // AUTOMOD CONFIG
    // -------------------------------

    if (command === "automodconfig") {
        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                embeds: [
                    createEmbed(
                        "Permission Denied",
                        "You need the Manage Server permission to configure AutoMod."
                    )
                ],
                ephemeral: true
            });
        }

        const embed = createEmbed(
            "Ghosty AutoMod",
            "Configure Ghosty's automatic moderation system using the controls below.\n\n**Status:** Disabled\n**Spam Protection:** Enabled\n**Mention Protection:** Enabled\n**Invite Protection:** Enabled\n**Word Filter:** Enabled\n**Excessive Caps:** Disabled"
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("automod_enable")
                .setLabel("Enable")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("automod_configure")
                .setLabel("Configure")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("automod_logs")
                .setLabel("Logs")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_disable")
                .setLabel("Disable")
                .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }

    // -------------------------------
    // PING
    // -------------------------------

    if (command === "ping") {
        return interaction.reply({
            embeds: [
                createEmbed(
                    "Ghosty Ping",
                    `Latency: **${client.ws.ping}ms**`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // UPTIME
    // -------------------------------

    if (command === "uptime") {
        const seconds = Math.floor(process.uptime());

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        return interaction.reply({
            embeds: [
                createEmbed(
                    "Ghosty Uptime",
                    `${days}d ${hours}h ${minutes}m`
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // BOT INFO
    // -------------------------------

    if (command === "botinfo") {
        return interaction.reply({
            embeds: [
                createEmbed(
                    "Ghosty",
                    "Ghosty is a Discord moderation and utility bot."
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // HELP
    // -------------------------------

    if (command === "help") {
        return interaction.reply({
            embeds: [
                createEmbed(
                    "Ghosty Commands",
                    "**Moderation**\n`/ban` `/unban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings`\n\n**Messages**\n`/clear` `/purge` `/slowmode` `/lock` `/unlock` `/lockdown` `/unlockdown`\n\n**AutoMod**\n`/automodconfig`\n\n**Configuration**\n`/setup` `/settings` `/logs` `/logsstatus`\n\n**Information**\n`/userinfo` `/serverinfo` `/roleinfo` `/channelinfo` `/avatar` `/banner`\n\n**Staff**\n`/staff` `/modstats`\n\n**Utility**\n`/help` `/ping` `/uptime` `/botinfo` `/invite` `/support`"
                )
            ],
            ephemeral: true
        });
    }

    // -------------------------------
    // DEFAULT
    // -------------------------------

    return interaction.reply({
        embeds: [
            createEmbed(
                "Command Not Implemented",
                "This Ghosty command has been registered but its functionality has not been added yet."
            )
        ],
        ephemeral: true
    });
}

// ======================================================
// BUTTON HANDLER
// ======================================================

async function handleButton(interaction) {
    if (!interaction.customId.startsWith("automod_")) {
        return;
    }

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({
            embeds: [
                createEmbed(
                    "Permission Denied",
                    "You need the Manage Server permission to configure AutoMod."
                )
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === "automod_enable") {
        return interaction.update({
            embeds: [
                createEmbed(
                    "Ghosty AutoMod",
                    "AutoMod has been enabled for this server.\n\n**Status:** Enabled\n**Spam Protection:** Enabled\n**Mention Protection:** Enabled\n**Invite Protection:** Enabled\n**Word Filter:** Enabled\n**Excessive Caps:** Disabled"
                )
            ],
            components: interaction.message.components
        });
    }

    if (interaction.customId === "automod_disable") {
        return interaction.update({
            embeds: [
                createEmbed(
                    "Ghosty AutoMod",
                    "AutoMod has been disabled for this server.\n\n**Status:** Disabled"
                )
            ],
            components: interaction.message.components
        });
    }

    if (interaction.customId === "automod_configure") {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("automod_spam")
                .setLabel("Spam")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_mentions")
                .setLabel("Mentions")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_invites")
                .setLabel("Invites")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("automod_words")
                .setLabel("Word Filter")
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({
            embeds: [
                createEmbed(
                    "AutoMod Configuration",
                    "Choose the AutoMod feature you want to configure."
                )
            ],
            components: [row]
        });
    }

    if (interaction.customId === "automod_logs") {
        return interaction.reply({
            embeds: [
                createEmbed(
                    "AutoMod Logs",
                    "AutoMod logging configuration will be available here."
                )
            ],
            ephemeral: true
        });
    }
}

// ======================================================
// LOGIN
// ======================================================

if (!process.env.DISCORD_TOKEN) {
    console.error("DISCORD_TOKEN is missing from environment variables.");
    process.exit(1);
}

if (!process.env.DISCORD_CLIENT_ID) {
    console.error("DISCORD_CLIENT_ID is missing from environment variables.");
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
