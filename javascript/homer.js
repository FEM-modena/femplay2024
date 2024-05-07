/*
 *  Homer - The Story Flow Editor.
 *  Copyright (c) 2021-2022. Open Lab s.r.l - Florence, Italy
 *  Developer: Pupunzi (Matteo Bicocchi)
 *  version: {{ version }}
 */
window.homerJson = "projectData/homer.json";

window.project_uid = null;
window.project = null;
window.actor = null;
window.avatar = null;
window.Avataaars = Avataaars;

window.Homer = new HomerParser(window.homerJson, null, () => {homerDrawer.init();});

window.homerDrawer = {

	/** DRAWER *****************************************************************************/

	placeholders: {
		title          : $("header h1"),
		project_name   : $("#project-name"),
		project_content: $("#project-content"),
		structure      : $("#structure"),
		project        : $("#project"),
		flowList       : $("#flows"),

		locales: $("#locale"),

		flow         : $("#flow"),
		properties   : $("#properties"),
		flow_title   : $("#flow #cover h1"),
		project_title: $("#flow #cover h2"),
		cover        : $("#cover"),
		node_content : $("#node-content"),
		theEnd       : $("#the-end"),

		actor_avatar_placeholder: $("#actor-avatar"),
		actor_name_placeholder  : $("#actor-name"),
		text_placeholder        : $("#text"),
		choices_placeholder     : $("#choices"),
	},

	init: () => {
		/**
		 * List all Project Locale
		 */
		Homer._project._availableLocale.forEach((locale) => {

			//console.debug(locale);

			let locale_placeholder = $("<div>").addClass("button locale");
			locale_placeholder.html(locale._code);
			locale_placeholder.on("click", () => {
				homerDrawer.placeholders.locales.find(".selected").removeClass("selected");
				homerDrawer.selectLocale(locale._code);
				locale_placeholder.addClass("selected");
			});

			/**
			 * Select actual Project locale
			 */
			if (Homer._project._locale === locale._code)
				locale_placeholder.addClass("selected");
			homerDrawer.placeholders.locales.append(locale_placeholder);
			//console.debug(homerDrawer.placeholders.locales)
		});

		/**
		 * Project Name
		 */
		homerDrawer.placeholders.project_name.html(Homer._project._name);
		homerDrawer.placeholders.project_name.addClass("selected");
		homerDrawer.placeholders.title.html(Homer._project._name);

		/**
		 * List all Project Flows
		 */
		Homer._project._flows.forEach((flow) => {
			let flow_placeholder = $("<div>").addClass("button").attr({id: flow._id});
			flow_placeholder.html(flow._name);
			flow_placeholder.on("click", () => {
				homerDrawer.selectFlow(flow._id);
			});
			homerDrawer.placeholders.flowList.append(flow_placeholder);
		});

		/**
		 * List Project Actors
		 */
		homerDrawer.printActors();

	},

	selectProject: () => {
		homerDrawer.placeholders.flowList.find(".selected").removeClass("selected");
		homerDrawer.placeholders.structure.find("#project-name").addClass("selected");
		homerDrawer.placeholders.flow.hide();
		homerDrawer.placeholders.project.show();
	},

	selectFlow: (flowId) => {


		homerDrawer.placeholders.flow.show();
		homerDrawer.placeholders.flow.find("#cover").show();

		homerDrawer.placeholders.flow.find("#node-content").hide();

		homerDrawer.placeholders.project.hide();

		homerDrawer.placeholders.theEnd.hide();
		homerDrawer.placeholders.structure.find("#project-name").removeClass("selected");
		homerDrawer.placeholders.flowList.find(".selected").removeClass("selected");
		homerDrawer.placeholders.flowList.find("#" + flowId).addClass("selected");

		let flow = Homer.getFlow(flowId);

		Homer._globalVars = HomerParser.globalVariables;
		Homer._localVars = [];
		Homer.start(null, flow._name);

		homerDrawer.placeholders.project_title.html(Homer._project._name);
		homerDrawer.placeholders.flow_title.html(flow._name);

		homerDrawer.printFlowData(flowId, Homer._selectedNodeId);

	},

	printActors: () => {

		$("#project-buttons").find(".selected").removeClass("selected");
		$("#project-actors").addClass("selected");
		homerDrawer.placeholders.project_content.empty();
		let title = "<h2>Actors</h2>";
		homerDrawer.placeholders.project_content.append(title);

		Homer._project._actors.forEach((actor) => {
			let actor_placeholder = $("<div>").addClass("list");
			actor_placeholder.html(actor._name);
			homerDrawer.placeholders.project_content.append(actor_placeholder);
		})
	},

	printGlobalVariables: () => {

		$("#project-buttons").find(".selected").removeClass("selected");
		$("#project-global-variables").addClass("selected");
		homerDrawer.placeholders.project_content.empty();

		let title = "<h2>Global Variables</h2>";
		homerDrawer.placeholders.project_content.append(title);

		Homer._project._variables.forEach((variable) => {
			let variable_placeholder = $("<div>").addClass("list");
			variable_placeholder.html(variable._key + " = " + variable._value);
			homerDrawer.placeholders.project_content.append(variable_placeholder);
		})
	},

	printLabels: () => {
		$("#project-buttons").find(".selected").removeClass("selected");
		$("#project-labels").addClass("selected");
		homerDrawer.placeholders.project_content.empty();

		let title = "<h2>Labels</h2>";
		homerDrawer.placeholders.project_content.append(title);

		Homer._project._labels.forEach((label) => {
			let label_placeholder = $("<div>").addClass("list");
			let text = Homer.getContent(label) ? Homer.getContent(label)._text : "...";
			label_placeholder.html(label._key + " = " + text);
			homerDrawer.placeholders.project_content.append(label_placeholder);
		})
	},

	printMetadata: () => {
		$("#project-buttons").find(".selected").removeClass("selected");
		$("#project-meta").addClass("selected");
		homerDrawer.placeholders.project_content.empty();

		let title = "<h2>Metadata</h2>";
		homerDrawer.placeholders.project_content.append(title);

		Homer._project._metadata.forEach((metadata) => {
			let metadata_placeholder = $("<div>").addClass("list");
			metadata_placeholder.html(metadata._icon + " - " + metadata._uid);
			homerDrawer.placeholders.project_content.append(metadata_placeholder);

			metadata._values.forEach((value) => {
				let metadata_value_placeholder = $("<div>").addClass("sub-list");
				metadata_value_placeholder.html(value._icon + " - " + value._uid);
				homerDrawer.placeholders.project_content.append(metadata_value_placeholder);
			})
		})
	},

	printFlowData: (flowId, nodeId) => {
		let flow = Homer.getFlow(flowId);
		homerDrawer.placeholders.properties.empty();

		let title = "<h3>Flow:</h3><h4>" + flow._name + "</h4>";
		homerDrawer.placeholders.properties.append(title);
		let id = "<div class='list small'><span class='label'>id:</span>" + flow._id + "</div>";
		homerDrawer.placeholders.properties.append(id);
		homerDrawer.printNodeData(nodeId);
	},

	printNodeData(nodeId) {

		let node = Homer.getNode(nodeId);

		homerDrawer.placeholders.properties.append("<hr>");

		let title = "<h3>Node:</h3>";
		homerDrawer.placeholders.properties.append(title);

		let id = "<div class='list small'><span class='label'>Id:</span>" + node._id + "</div>";
		homerDrawer.placeholders.properties.append(id);

		let type = "<div class='list'> <span class='label'>Type:</span>" + node._type + "</div>";
		homerDrawer.placeholders.properties.append(type);

		let a = Homer.getNodeActor(node._id);
		if (a !== null) {
			let actor = "<div class='list'> <span class='label'>Actor:</span>" + a._name + "</div>";
			homerDrawer.placeholders.properties.append(actor);
		}

		if (node._cycleType !== null) {
			let cycleType = "<div class='list'> <span class='label'>Cycle Type:</span>" + node._cycleType + "</div>";
			homerDrawer.placeholders.properties.append(cycleType);
		}

		if (node._elements.length) {
			let elementsLenght = "<div class='list'> <span class='label'>Elements:</span>" + node._elements.length + "</div>";
			homerDrawer.placeholders.properties.append(elementsLenght);
		}
		/**
		 * Global Variables
		 */
		homerDrawer.placeholders.properties.append("<hr>");
		title = "<h3>Global Variables:</h3><br>";
		homerDrawer.placeholders.properties.append(title);

		let globalVariables = "";
		for (const key in Homer._globalVars) {
			let value = "";

			if (typeof Homer._globalVars[key] == "object") {
				let vs = [];
				for (const x in Homer._globalVars[key]) {
					vs.push(Homer._globalVars[key][x])
				}
				value = vs.toString();
			} else {
				value = Homer._globalVars[key];
			}
			globalVariables += "<key>" + key + ": </key> <value>" + value + "</value>";
			globalVariables += "<br>";
		}
		homerDrawer.placeholders.properties.append(globalVariables);

		title = "<br><h3>Local Variables:</h3><br>";
		homerDrawer.placeholders.properties.append(title);

		let localVariables = "";
		for (const key in Homer._localVars) {
			let value = Homer._localVars[key];
			localVariables += "<key>" + key + ": </key> <value>" + value + "</value>";
			localVariables += "<br>";
		}
		homerDrawer.placeholders.properties.append(localVariables);

	},

	/** FLOW PARSER *****************************************************************************/

	selectLocale: (locale) => {
		Homer._project._locale = locale;
		Homer._locale = locale;
	},

	start: () => {
		Homer.selectedNodes = [];
		homerDrawer.placeholders.cover.fadeOut(300, () => {
			homerDrawer.placeholders.node_content.fadeIn();
		});

		homerDrawer.drawNext();
	},

	drawNext: (elementId = null) => {

		let hasNext = Homer.nextNode(elementId);
		let flow = Homer.getSelectedFlow();
		let node = Homer.getNode();

		$("#flow-name").html(flow._name);

		if (!hasNext || node == null) {
			homerDrawer.DialogueDone();
			return;
		}

		let actor_avatar_placeholder = $("#actor-avatar");
		let actor_name_placeholder = $("#actor-name");
		let text_placeholder = $("#text");
		let choices_placeholder = $("#choices");

		window.actor = null;
		window.avatar = "";

		if (node != null) {

			window.actor = Homer.getNodeActor();

			if (window.actor != null && !window.actor._isNarrator)
				window.avatar = window.Avataaars.create(actor._avatar._options);

			let actorName = actor._name + (window.actor._isNarrator ? " (narrator)" : "");
			switch (node._type) {

				case NodeType.text:
					homerDrawer.placeholders.actor_avatar_placeholder.empty();
					homerDrawer.placeholders.actor_name_placeholder.empty();
					homerDrawer.placeholders.text_placeholder.empty();
					homerDrawer.placeholders.choices_placeholder.empty();

					homerDrawer.placeholders.actor_avatar_placeholder.html(avatar);
					homerDrawer.placeholders.actor_name_placeholder.html(actorName);
					homerDrawer.placeholders.text_placeholder.html(Homer.getParsedText());

					let next = $("<button>").addClass("main").html("Next");

					next.on("click", () => {
						homerDrawer.drawNext();
					});

					homerDrawer.placeholders.choices_placeholder.html(next);
					homerDrawer.placeholders.choices_placeholder.prepend("<br><br>");
					break;

				case NodeType.choices:
					homerDrawer.placeholders.actor_avatar_placeholder.empty();
					homerDrawer.placeholders.actor_name_placeholder.empty();
					homerDrawer.placeholders.text_placeholder.empty();
					homerDrawer.placeholders.choices_placeholder.empty();
					homerDrawer.placeholders.actor_name_placeholder.html(actorName);
					homerDrawer.placeholders.actor_avatar_placeholder.html(avatar);

					homerDrawer.placeholders.text_placeholder.html(Homer.getParsedText(node._header));

					let elements = Homer.getAvailableChoices();
					elements.forEach((element) => {
						let choiceText = Homer.getParsedText(element);
						let choiceButton = $("<button>").addClass("choice").html(choiceText);
						choiceButton.on("click", () => {
							homerDrawer.drawNext(element._id);
						});
						homerDrawer.placeholders.choices_placeholder.append(choiceButton);
					});
					break;
			}

			/**
			 * Print Flow/Node data
			 */
			homerDrawer.printFlowData(Homer._selectedFlowId);
		}
	},

	DialogueDone: () => {

		homerDrawer.placeholders.theEnd.show();
		setTimeout(() => {
			homerDrawer.placeholders.theEnd.hide();
			homerDrawer.selectFlow(Homer._selectedFlowId);
		}, 4000);
		console.debug("THE END")
	}
};
