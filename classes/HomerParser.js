/*
 *  * Homer - The Story Flow Editor.
 *  * Copyright (c) 2021-2024. Open Lab s.r.l - Florence, Italy
 *  * Developer: Pupunzi (Matteo Bicocchi)
 *  * version: 1.2.4
 *  * build: 47307
 */

class HomerParser {
	static apiVersion = "1.4";
	static globalVariables = window.HomerVars || {};
	static activeSubFlows = [];

	/**
	 * Constructor function for the Homer class.
	 * @constructor
	 * @param {Object|string} project - The project object or the path to the project file.
	 * @param {string|null} flowName - The name of the flow to load (if applicable).
	 * @param {Function|null} onReady - A callback function to be executed when the project is loaded and ready.
	 *
	 * @property {Object} _project - The loaded project object.
	 * @property {string|null} _locale - The current locale of the conversation.
	 * @property {string|null} _selectedFlowId - The ID of the currently selected flow.
	 * @property {string|null} _selectedNodeId - The ID of the currently selected node.
	 * @property {Object} _globalVars - The global variables defined in the HomerParser.
	 * @property {Object} _localVars - The local variables specific to the instance.
	 * @property {Array} _variations - An array to store variations in the conversation.
	 * @property {Object|null} _metadata - Additional metadata associated with the project.
	 * @property {boolean} _isJumping - A flag indicating whether the conversation is currently in a jump state.
	 */
	constructor(project, flowName = null, onReady = null) {
		this._project = null;
		this._locale = null;
		this._selectedFlowId = null;
		this._selectedNodeId = null;
		this._globalVars = HomerParser.globalVariables;
		this._localVars = {};
		this._variations = [];
		this._metadata = null;
		this._isJumping = false;
		window.Homer = this;

		/**
		 * Generates a random integer between the specified minimum and maximum values (inclusive).
		 *
		 * @param {number} min - The minimum value of the range (inclusive).
		 * @param {number} max - The maximum value of the range (inclusive).
		 * @returns {number} A random integer within the specified range.
		 *
		 * @example
		 * // Generate a random integer between 1 and 10 (inclusive)
		 * const randomNumber = RND(1, 10);
		 */
		window.RND = (min, max) => {
			return min + Math.floor(Math.random() * ((max + 1) - min));
		};

		if (typeof project === "object") {
			this.load(project, flowName);
			if (typeof onReady === "function") {
				onReady(project);
			}
		} else {
			this.loadFromFile(project, flowName, onReady);
		}

		return this;
	}

	/**
	 * Initializes variations based on localized contents in the project flows.
	 * Extracts variations from elements and populates the _variations array.
	 */
	InitializeVariations() {
		// Clear existing variations array
		this._variations = [];

		// Iterate through project flows, nodes, and elements to find variations
		this._project._flows.forEach((flow) => {
			flow._nodes.forEach((node) => {
				node._elements.forEach((element) => {
					// Check if the element has localized contents
					if (element._localizedContents.length) {
						// Define a regular expression to find variations within the content
						const variationsRegExp = /\[\[(.*?)\]\]/gi;

						// Get the content object for the element
						const contentObj = this.getLocalizedContent(element);
						const content = contentObj ? contentObj._text : "";

						// Find variation blocks within the content
						const variationsBlocks = content.match(variationsRegExp);

						// If variation blocks are found, process each block
						if (variationsBlocks && variationsBlocks.length > 0) {
							let idx = 0;

							variationsBlocks.forEach((variation) => {
								// Extract variation information from the block
								let v = variation.replace(/\[\[/g, "").replace(/\]\]/g, "").trim();
								v = v.replace(/ \| /g, "|");
								const type = v.split(" ")[0].trim();
								const variations = v.replace(type, "").split("|");

								// Create a variation object and add it to the variations array
								const variationObj = {
									_index    : idx,
									_type     : type,
									_values   : variations,
									_elementId: element._id,
									_visited  : []
								};

								this._variations.push(variationObj);
							});
						}
					}
				});
			});
		});
	}

	/**
	 * Retrieves variations associated with a specific element.
	 *
	 * @param {string} elementId - The ID of the element for which to retrieve variations.
	 * @returns {Array} - An array of variations associated with the specified element, or an empty array if none are found.
	 */
	getElementVariations(elementId) {
		// Filter variations based on the provided elementId
		return this._variations.filter(variation => variation._elementId === elementId) || [];
	}

	/**
	 * Finds and returns all words starting with '$' (dollar sign) in the given string.
	 *
	 * @param {string} string - The input string in which to search for global variables.
	 * @returns {Array|null} - An array containing all words starting with '$' found in the string, or null if none are found.
	 * @static
	 */
	static findGlobalVariables(string) {
		// Define a regular expression to match words starting with '$'
		const regExp = /\$([a-zA-Z]\w+)/gi;

		// Use the regular expression to find matches in the input string
		return string.match(regExp);
	}

	/**
	 * Finds and returns all words starting with '%' (percent sign) in the given string,
	 * filtering out any non-matching elements.
	 *
	 * @param {string} string - The input string in which to search for local variables.
	 * @returns {Array|null} - An array containing all words starting with '%' found in the string, or null if none are found.
	 * @static
	 */
	static findLocalVariables(string) {
		// Define a regular expression to match words starting with '%'
		const regExp = /\%([a-zA-Z0-9\]\w.?()[a-zA-Z]+)/gi;

		// Use the regular expression to find matches in the input string
		const match = string.match(regExp);

		// If no matches are found, return null
		if (match === null) {
			return null;
		}

		// Filter out non-matching elements and return the result
		return match.filter(variable => variable.startsWith("%"));
	}

	/**
	 * Resets global variables based on the values defined in the project's variables.
	 * Skips variables of type 'separator'.
	 */
	resetGlobalVariables() {
		// Iterate through project variables and update global variables
		this._project._variables.forEach((variable) => {
			// Skip variables of type 'separator'
			if (variable._type !== VariableType.separator) {
				// Set the global variable to the value defined in the project's variable
				this._globalVars[variable._key] = variable._value;

				// Convert string representations of boolean values to actual booleans
				this._globalVars[variable._key] = this._globalVars[variable._key] === 'false' ? false : this._globalVars[variable._key];
				this._globalVars[variable._key] = this._globalVars[variable._key] === 'true' ? true : this._globalVars[variable._key];
			}
		});
	}

	/**
	 * Resets all local variables by setting their values to null.
	 */
	resetLocalVariables() {
		// Iterate through local variables and set their values to null
		for (const [key] of Object.entries(this._localVars)) {
			this._localVars[key] = null;
		}
	}

	/**
	 * Sanitizes a string by removing HTML line breaks and replacing HTML entities with their corresponding characters.
	 *
	 * @param {string} str - The input string to be sanitized.
	 * @returns {string} - The sanitized string.
	 * @static
	 */
	static sanitizeVariables(str) {
		// Remove HTML line breaks
		str = str.replace(/\<br\>/gi, "");

		// Replace HTML entities with corresponding characters
		str = str.replace(/&gt;/g, ">");
		str = str.replace(/&lt;/g, "<");
		str = str.replace(/&nbsp;/g, " ");

		// Return the sanitized string
		return str;
	}

	static stripHtml(html) {
		// Create a temporary div element
		var tempDiv = document.createElement("div");
		// Set the HTML content
		tempDiv.innerHTML = html;
		// Return the text content (without HTML tags)
		return tempDiv.textContent || tempDiv.innerText || "";
	}

	/**
	 * Removes HTML tags from a given text, leaving only the text content.
	 *
	 * @param {string} text - The input text containing HTML tags.
	 * @returns {string} - The text content without HTML tags.
	 * @static
	 */
	static getTextWithoutTags(text) {
		// Use a regular expression to remove HTML tags from the input text
		return text.replace(/<(?!br\s*\/?)[^>]+>/g, '');
	}

	/**
	 * Parses the text content of an element, applying variations, conditional statements, and handling special tags.
	 *
	 * @param {Object} element - The element containing the text content to be parsed.
	 * @param {boolean} [force_eval=false] - Whether to force the evaluation of variables even for choices.
	 * @returns {string} The parsed text content with applied variations and conditional statements.
	 *
	 * @example
	 * // Parse the text content of an element
	 * const parsedText = parsedText(elementObject, true);
	 */
	parsedText(element, force_eval = false) {

		if (!element) {
			return "";
		}

		const content = this.getLocalizedContent(element)._text;
		let output = content;

		/**
		 * Find VARIATIONS
		 */
		    //find anything inside [[]]
		const variationsRegExp = /\[\[(.*?)\]\]/gi;
		const variationsBlocks = content.match(variationsRegExp);
		if (variationsBlocks && variationsBlocks.length > 0) {
			let idx = 0;
			variationsBlocks.forEach((variation) => {
				let v = variation.replace(/\[\[/g, "").replace(/\]\]/g, "").trim();
				v = v.replace(/ \| /g, "|");
				const type = v.split(" ")[0].trim();
				const variations = v.replace(type, "").split("|"); //.replace(/ /g, "")
				const elementVariations = this.getElementVariations(element._id);

				const persistedVariation = elementVariations[idx];
				let variationContent = "";

				switch (persistedVariation._type) {
					case "LIST":
						variationContent = persistedVariation._values.shift();
						if (!variationContent) {
							variationContent = variations[variations.length - 1];
						}
						break;

					case "LOOP":
						variationContent = persistedVariation._values.shift();
						if (persistedVariation._values.length === 0) {
							persistedVariation._values = variations;
						}
						break;

					case "RND":
						let rnd = Math.floor(Math.random() * variations.length);
						variationContent = variations[rnd];
						break;

					case "SRND":
						let srnd = Math.floor(Math.random() * persistedVariation._values.length);
						variationContent = persistedVariation._values[srnd];
						persistedVariation._values.splice(srnd, 1);
						if (persistedVariation._values.length === 0) {
							persistedVariation._values = variations;
						}
						break;

				}
				output = output.replaceAll(variation, "<variation>" + variationContent + "</variation>");
				++idx;
			})
		}

		/**
		 * Find CONDITIONAL_INSIDE_TEXT
		 */
		const conditionalInsideTextRegExp = /\[IF(.*?)\]/gi;
		const conditionalInsideTextBlocks = content.match(conditionalInsideTextRegExp);

		if (conditionalInsideTextBlocks && conditionalInsideTextBlocks.length > 0) {
			conditionalInsideTextBlocks.forEach((conditionalInsideText) => {
				const condition = conditionalInsideText.split("?")[0].replace("[IF ", "").trim();
				const resultRegEx = /(["'])(?:(?=(\\?))\2.)*?\1/gi;
				const possibleResults = conditionalInsideText.split("?")[1].replace("]", "").match(resultRegEx);
				let str = HomerParser.getTextWithoutTags(condition);
				const globalVars = HomerParser.findGlobalVariables(condition) || [];
				globalVars.forEach((variable) => {
					str = str.replaceAll(variable, "Homer._globalVars." + variable.replace("$", ""));
				});

				const localVars = HomerParser.findLocalVariables(condition) || [];
				localVars.forEach((variable) => {
					str = str.replaceAll(variable, "Homer._localVars." + variable.replace("%", ""));
				});

				let print = " --ERROR-- ";
				str = HomerParser.sanitizeVariables(str);
				let result = null;
				try {
					result = eval(str);
				} catch (e) {
					console.error(e);
				}

				if (result != null) {
					print = result ? possibleResults[0] : possibleResults[1];
				}

				print = print !== undefined ? print.replace(/"/gi, "") : " --ERROR-- ";

				output = output.replaceAll(conditionalInsideText, print);
			})
		}

		/**
		 * Find TODOs
		 */
		const todoRegExp = /\[TODO(.*?)\]/gi;
		const todoBlocks = content.match(todoRegExp);
		if (todoBlocks && todoBlocks.length > 0) {
			todoBlocks.forEach((todo) => {
				output = output.replaceAll(todo, "");
			})
		}

		/**
		 * Find JUSTONCE
		 */
		const justOnceRegExp = /\[-\]/gi;
		const justOnceBlocks = content.match(justOnceRegExp);
		if (justOnceBlocks && justOnceBlocks.length > 0) {
			justOnceBlocks.forEach((justonce) => {
				element._justOnce = true;
				output = output.replaceAll(justonce, "");
			});
		}

		/**
		 * Find IFNOMORE
		 */
		const ifNoMoreRegExp = /\[\+\]/gi;
		const ifNoMoreBlocks = content.match(ifNoMoreRegExp);

		if (ifNoMoreBlocks && ifNoMoreBlocks.length > 0) {
			ifNoMoreBlocks.forEach((ifNoMore) => {
				element._ifNoMore = true;
				output = output.replaceAll(ifNoMore, "");
			});
		}

		/**
		 * Find VARIABLES
		 */
		const variableRegExp = /\{(.*?)\}/gi;
		let variableBlocks = output.match(variableRegExp);

		/**
		 * Variables can also be set without curly brackets
		 * in that case get all the content
		 */
		if (
			!variableBlocks && element !== null
			&& (element._type === NodeType.condition || element._type === NodeType.variables)
		) {
			variableBlocks = [output];
		}

		if (variableBlocks !== null && variableBlocks.length) {
			variableBlocks.forEach((block) => {
				const variableBlock = HomerParser.stripHtml(block);
				let tmpString = variableBlock;

				const globalVariables = HomerParser.findGlobalVariables(variableBlock);
				const localVariables = HomerParser.findLocalVariables(variableBlock);

				if (globalVariables || localVariables) {
					tmpString = tmpString.replace("{", "").replace("}", "");

					if (globalVariables) {
						globalVariables.forEach((v) => {
							tmpString = tmpString.replace(v, "Homer._globalVars." + v.replace("$", ""));
						});
					}

					if (localVariables) {
						localVariables.forEach((v) => {
							tmpString = tmpString.replace(v, "Homer._localVars." + v.replace("%", ""));
						});
					}

					let evaluated = "--error--";

					try {
						if (force_eval || element._type !== NodeType.choices || (element._type === NodeType.choices && tmpString.indexOf("=") < 0)) {
							evaluated = eval(tmpString);
							// console.debug("evaluated", element._type, force_eval, tmpString, evaluated)
						}

					} catch (e) {
						console.debug(e);
						console.debug(tmpString)
					}

					if (
						(globalVariables && variableBlock.replace("{", "").replace("}", "").trim() === globalVariables[0])
						|| localVariables && variableBlock.replace("{", "").replace("}", "").trim() === localVariables[0]
					) {
						output = output.replace(block, evaluated);
					} else {
						output = output.replace(block, "");
					}
				}
			});
		}

		//Trim from BR and \n
		output = output.replace(/&nbsp;/g, " ").trim();
		output = output.replace(/^\s*<br\s*\/?>|<br\s*\/?>\s*$/g, '').trim();
		return output;
	}

	/**
	 * Loads a project, initializes variables, variations, and starts the specified or default flow.
	 *
	 * @param {Object} project - The project to be loaded.
	 * @param {string|null} [flowName=null] - The name of the flow to start. If null, the first flow in the project is selected.
	 * @param {function|null} [onReady=null] - A callback function to be executed when the project is loaded and ready.
	 */
	load(project, flowName = null, onReady = null) {
		// Deep clone the project to avoid modifying the original
		this._project = JSON.parse(JSON.stringify(project));

		// Check API version compatibility
		if (this._project._apiVersion !== HomerParser.apiVersion) {
			console.warn("Your Project API version (" + this._project._apiVersion + ") is different from your API version (" + HomerParser.apiVersion + ")");
			console.warn("You should download the package that includes the latest API.");
		}

		// Select the specified or default flow
		const flow = flowName ? this.getFlow(flowName) : this._project._flows[0];

		// Set selected flow and locale
		this._selectedFlowId = flow._id;
		this._locale = this._project._locale;

		// Initialize global variables based on project variables
		this._project._variables.forEach((variable) => {
			if (variable._type !== "separator" && !this._globalVars[variable._key]) {
				this._globalVars[variable._key] = variable._value;
			}

			if (variable._type === "bool") {
				this._globalVars[variable._key] = eval(this._globalVars[variable._key]);
			}
		});

		this._project._flows.forEach(flow => {
			flow._nodes.forEach(node => {
				node._elements.forEach(element => {
					element._visited = false;
				})
			})
		})

		// Initialize variations if not already initialized
		if (this._variations.length === 0) {
			this.InitializeVariations();
		}

		// Start the specified or default flow
		this.start(null, flow._name);

		HomerParser.activeSubFlows = [];

		// Execute the onReady callback if provided and is a function
		if (typeof onReady === "function") {
			onReady(project);
		}
	}

	/**
	 * Loads a project from a JSON file, initializes variables, variations, and starts the specified or default flow.
	 *
	 * @param {string} filePath - The path to the JSON file containing the project data.
	 * @param {string|null} [flowId=null] - The ID of the flow to start. If null, the first flow in the project is selected.
	 * @param {function|null} [onReady=null] - A callback function to be executed when the project is loaded and ready.
	 */
	loadFromFile(filePath, flowId = null, onReady = null) {
		// Capture the reference to the current object
		const homerParser = this;

		//Load JSON data from the file
		fetch(filePath)
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then(data => {
				// Handle the JSON data
				homerParser.load(data, flowId, onReady);
			})
			.catch(error => {
				// Handle any errors
				console.error('There was a problem with the fetch operation:', error);
			});
	}

	/**
	 * Sets the selected flow and node to start the story, based on the provided nodeId and flowName.
	 * If flowName is not provided, it defaults to the first flow in the project.
	 * If nodeId is not provided, it defaults to the start node of the selected flow.
	 *
	 * @param {string|null} [nodeId=null] - The ID of the node to start from. If null, defaults to the start node of the selected flow.
	 * @param {string|null} [flowName=null] - The name of the flow to start. If null, defaults to the first flow in the project.
	 * @returns {string} - The ID of the selected starting node.
	 */
	start(nodeId = null, flowName = null) {
		// If flowName is not provided, select the first flow in the project
		if (!flowName) {
			const flow_id = this._project._flowGroups[0]._flowIds[0];
			const f = this.getFlow(flow_id);
			flowName = f._name;
		}

		// Get the flow by name and set it as the selected flow
		const flow = this.getFlow(flowName);

		this._selectedFlowId = flow._id;

		// Get the start node of the selected flow
		const startNode = this.getNodesByType(NodeType.start)[0];

		// Set the selected node based on the provided nodeId or default to the start node
		this._selectedNodeId = nodeId === null ? startNode._id : nodeId;

		// Return the ID of the selected starting node
		return this._selectedNodeId;
	}

	/**
	 * Restarts the story by setting the selected node to the start node of the current flow.
	 *
	 * @returns {string} - The ID of the selected starting node after restarting.
	 */
	restart() {
		// Get the start node of the current flow
		const startNode = this.getNodesByType(NodeType.start)[0];

		// Set the selected node to the start node
		this._selectedNodeId = startNode._id;

		// Return the ID of the selected starting node after restarting
		return this._selectedNodeId;
	}

	// ███████ FLOW █████████████████████████████████████

	/**
	 * Retrieves an array of flow groups present in the project.
	 *
	 * @returns {Array} - An array containing flow groups from the project.
	 */
	getFlowGroups() {
		// Return the array of flow groups from the project
		return this._project._flowGroups;
	}

	/**
	 * Retrieves a flow from the project based on the provided flow ID.
	 * If the flow with the specified ID is not found, it attempts to find the flow by name.
	 * If the flow with the specified name is not found, it attempts to find the flow by slug.
	 *
	 * @param {string} flow_identifier - The ID or name of the flow to retrieve.
	 * @returns {Object|null} - The flow object if found, or null if not found.
	 */
	getFlow(flow_identifier) {
		// Initialize the variable to store the found flow
		let f = null;

		// Iterate through flows in the project to find the one with the provided ID
		this._project._flows.forEach((flow) => {
			if (flow._id === flow_identifier) {
				f = flow;
			}
		});

		// If the flow is not found by ID, attempt to find it by name
		if (f === null) {
			// Iterate through flows in the project to find the one with the provided name
			this._project._flows.forEach((flow) => {
				if (flow._name === flow_identifier) {
					f = flow;
				}
			});
		}

		// If the flow is not found by id, attempt to find it by slug
		if (f === null) {
			this._project._flows.forEach((flow) => {
				if (flow._slug === flow_identifier) {
					f = flow;
				}
			});
		}

		// Return the found flow object or null if not found
		return f;
	}

	/**
	 * Retrieves an array of all flows present in the project, including flows from different flow groups.
	 *
	 * @returns {Array} - An array containing all flows from the project.
	 */
	getFlows() {
		// Initialize an array to store the retrieved flows
		const flows = [];

		// Iterate through flow groups in the project
		this._project._flowGroups.forEach((flowGroup) => {
			// Iterate through flow IDs in each flow group and retrieve the corresponding flow
			flowGroup._flowIds.forEach((flowId) => {
				const flow = this.getFlow(flowId);
				flows.push(flow);
			});
		});

		// Return the array containing all flows from the project
		return flows;
	}

	/**
	 * Retrieves the currently selected flow based on the stored selected flow ID.
	 *
	 * @returns {Object|null} - The selected flow object if found, or null if not found.
	 */
	getSelectedFlow() {
		// Initialize the variable to store the selected flow
		let f = null;

		// Iterate through flows in the project to find the one with the stored selected flow ID
		this._project._flows.forEach((flow) => {
			if (flow._id === this._selectedFlowId) {
				f = flow;
			}
		});

		// Return the found selected flow object or null if not found
		return f;
	}

	// ███████ NODE █████████████████████████████████████

	/**
	 * Retrieves a node from the currently selected flow based on the provided node ID.
	 * If node ID is not provided, it defaults to the stored selected node ID.
	 *
	 * @param {string|null} [nodeId=null] - The ID of the node to retrieve. If null, defaults to the stored selected node ID.
	 * @returns {Object|null} - The node object if found, or null if not found.
	 */
	getNode(nodeId = null, flowId = null) {
		// If node ID is not provided, default to the stored selected node ID
		nodeId = nodeId || this._selectedNodeId;

		// Get the currently selected flow
		let flow = null;

		if (flowId) {
			flow = this.getFlow(flowId);
		} else {
			flow = this.getSelectedFlow();
		}

		// Initialize the variable to store the found node
		let n = null;

		// Iterate through nodes in the selected flow to find the one with the provided ID
		flow._nodes.forEach((node) => {
			if (node._id === nodeId) {
				n = node;
			}
		});

		// Return the found node object or null if not found
		return n;
	}

	/**
	 * Retrieves an array of nodes in the currently selected flow that are linked to the specified node ID.
	 * If node ID is not provided, it defaults to the stored selected node ID.
	 *
	 * @param {string|null} [nodeId=null] - The ID of the node to find linking nodes for. If null, defaults to the stored selected node ID.
	 * @returns {Array} - An array containing nodes linked to the specified node ID.
	 */
	getLinkingNodes(nodeId) {
		// If node ID is not provided, default to the stored selected node ID
		nodeId = nodeId || this._selectedNodeId;

		// Get the currently selected flow
		const flow = this.getSelectedFlow();

		// Initialize an array to store the linking nodes
		const nodes = [];

		// Iterate through nodes in the selected flow to find nodes linked to the specified node ID
		flow._nodes.forEach((node) => {
			node._connections.forEach(connection => {
				if (connection._to === nodeId) {
					nodes.push(node);
				}
			});
		});

		// Return the array containing nodes linked to the specified node ID
		return nodes;
	}

	/**
	 * Gets an array of nodes that are linked to the specified node (by ID) in the selected flow.
	 *
	 * @param {string} [nodeId=this._selectedNodeId] - The ID of the node to find linking nodes for.
	 * @returns {Array} An array of nodes linked to the specified node.
	 *
	 * @example
	 * // Get nodes linking to the currently selected node
	 * const linkingNodes = getNodesLinkingTo();
	 *
	 * // Get nodes linking to a specific node by ID
	 * const linkingNodes = getNodesLinkingTo("node123");
	 */
	getNodesLinkingTo(nodeId) {
		nodeId = nodeId || this._selectedNodeId;
		const flow = this.getSelectedFlow();
		const nodes = [];

		// Iterate through nodes in the flow
		flow._nodes.forEach((node) => {
			// Check connections of each node
			node._connections.forEach(connection => {
				// Add nodes linked to the specified node to the array
				if (connection._to === nodeId) {
					nodes.push(node);
				}
			});
		});

		return nodes;
	}

	/**
	 * Retrieves an array of nodes in the currently selected flow that are linked from the specified node ID.
	 * If node ID is not provided, it defaults to the stored selected node ID.
	 *
	 * @param {string|null} [nodeId=null] - The ID of the node to find linked nodes for. If null, defaults to the stored selected node ID.
	 * @returns {Array} - An array containing nodes linked from the specified node ID.
	 */
	getLinksToNodes(nodeId) {
		// If node ID is not provided, default to the stored selected node ID
		nodeId = nodeId || this._selectedNodeId;

		// Get the node with the specified ID
		const node = Homer.getNode(nodeId);

		// Initialize an array to store the linked nodes
		const linkToNodes = [];

		// If the node is found, iterate through its connections to find linked nodes
		if (node) {
			node._connections.forEach(connection => {
				linkToNodes.push(Homer.getNode(connection._to));
			});
		}

		// Return the array containing nodes linked from the specified node ID
		return linkToNodes;
	}

	/**
	 * Retrieves an array of nodes in the currently selected flow that match the specified node type.
	 *
	 * @param {string} type - The type of nodes to retrieve (e.g., NodeType.text, NodeType.choices).
	 * @returns {Array} - An array containing nodes of the specified type.
	 */
	getNodesByType(type) {
		// Get the currently selected flow
		const flow = this.getSelectedFlow();

		// Initialize an array to store nodes of the specified type
		const ns = [];

		// Iterate through nodes in the selected flow to find nodes of the specified type
		flow._nodes.forEach((node) => {
			if (node._type === type) {
				ns.push(node);
			}
		});

		// Return the array containing nodes of the specified type
		return ns;
	}

	/**
	 * Retrieves a node from the project based on the provided permalink.
	 *
	 * @param {string} permalink - The permalink of the node to retrieve.
	 * @returns {Object|null} - The node object if found, or null if not found.
	 */
	getNodeByPermalink(permalink) {
		// Initialize the variable to store the found node
		let node = null;

		// Iterate through flows in the project
		this._project._flows.forEach(flow => {
			// Iterate through nodes in each flow to find the one with the provided permalink
			flow._nodes.forEach((n) => {
				if (n._permalink === permalink) {
					node = n;
				}
			});
		});

		// Return the found node object or null if not found
		return node;
	}

	/**
	 * Check if the node with a specific ID exists.
	 * Passing the flow ID will check if that node exists within the flow.
	 * @param nodeId
	 * @param flowId
	 * @returns {boolean}
	 */
	nodeExists(nodeId, flowId = null) {
		let flow;
		if (flowId) {
			flow = Homer.getFlow(flowId);
		} else {
			flow = Homer.getSelectedFlow();
		}
		if (!flow) {
			return false;
		}
		return flow._nodes.filter(node => node._id === nodeId).length > 0;
	}

	/**
	 * Advances to the next node in the flow based on the current selected node and element.
	 * Handles logic for different node types and connections.
	 *
	 * @param {string|null} [elementId=null] - The ID of the element within the current node. If null, defaults to the stored selected element ID.
	 * @returns {Object|boolean} - The connection object to the next node if available, or false if reaching the end of the flow.
	 */
	nextNode(elementId = null) {
		// Check if the current node is "THE END", indicating the end of the flow
		if (this._selectedNodeId === "THE END") {
			return null;
		}

		// If the current node ID is not set, set it to the ID of the start node
		if (this._selectedNodeId === null) {
			this._selectedNodeId = this.getNodesByType(NodeType.start)[0]._id;
		}

		// Get the current node and the element within the current node
		let currentNode = this.getNode(this._selectedNodeId, this._selectedFlowId);
		const nodeElement = this.getNodeElement(currentNode._id, elementId);

		// Get available connections from the current element
		let connection = this.getAvailableConnections(elementId);

		if (!connection) {
			connection = this.getFailedConnection(currentNode);
		}

		// Handle logic based on the type of the previous node
		if (currentNode._type === NodeType.choices && !this._isJumping) {
			// Logic for handling choices and just-once elements
			if (nodeElement && nodeElement._justOnce) {
				nodeElement._visited = true;
			}
			this.getParsedText(nodeElement, true);

		} else if (currentNode._type === NodeType.jumpToNode) {
			//  Logic for handling jumping to another node
			if (!this.nodeExists(currentNode._jumpTo.nodeId, currentNode._jumpTo.flowId)) {
				// if (actualNode._jumpTo.flowId === "false" || actualNode._jumpTo.flowId === "Select a Flow") {
				alert("This 'jump to Node' is not set");
				return currentNode;
			}

			// Set the jumping flag
			this._isJumping = true;

		} else if (nodeElement) {
			nodeElement._visited = true;
		}

		// Handle cases where no connection or destination node is available
		if ((!connection || !connection._to) && currentNode._type !== NodeType.jumpToNode) {

			if (HomerParser.activeSubFlows.length) {
				const subFlow = HomerParser.activeSubFlows[0];

				if (subFlow.flowId !== this._selectedFlowId) {
					this.start(subFlow.nodeId, subFlow.flowId);
				}

				this._selectedNodeId = subFlow.nodeId;
				return this.nextNode();

			} else if (currentNode._type !== NodeType.jumpToNode) {
				this._selectedNodeId = "THE END";
				return false;
			}
		} else if (!this._isJumping) {
			// Move to the next node if not in a jump operation
			this._selectedNodeId = connection._to;
		}

		// Get the next node after the transition
		let targetNode = this.getNode(this._selectedNodeId);
		targetNode._previousNodeId = currentNode._id;

		if (targetNode._type === NodeType.choices) {
			let availableChoices = this.getAvailableChoices(targetNode._id);
			if (!availableChoices.length) {
				connection = this.getFailedConnection(targetNode);
				if (connection) {
					this._selectedNodeId = connection._to;
					targetNode = this.getNode(this._selectedNodeId);
					targetNode._previousNodeId = currentNode._id;
					return this.nextNode();
				}
			}
		}

		this._isJumping = false;

		// Handle logic specific to node types
		if (
			targetNode._type === NodeType.start ||
			targetNode._type === NodeType.note ||
			targetNode._type === NodeType.sequence ||
			targetNode._type === NodeType.random ||
			targetNode._type === NodeType.variables ||
			targetNode._type === NodeType.layout ||
			targetNode._type === NodeType.subFlow ||
			targetNode._type === NodeType.jumpToNode ||
			targetNode._type === NodeType.condition
		) {
			return this.nextNode();
		} else {
			// Return the connection to the next node
			return targetNode;
		}
	}

	// ███████ NODE ELEMENT █████████████████████████████████████
	/**
	 * Retrieves an available element from a specified node or the currently selected node.
	 * Elements are determined based on the node type and cycle type.
	 *
	 * @param {string|null} nodeId - The ID of the node from which to retrieve the element. If null, uses the currently selected node.
	 * @returns {Object|null} - The available element, or null if no available elements are found.
	 */
	getAvailableNodeElement(nodeId = null) {
		// If nodeId is not provided, use the currently selected node
		nodeId = nodeId || this._selectedNodeId;

		// Retrieve the specified node
		const node = this.getNode(nodeId);

		// Get the cycle type of the node
		const cycleType = node._cycleType;

		// Initialize variables
		let element = null;
		let availableElements = node._elements.filter((element) => {
			return !element._visited;
		});

		// Switch based on the node type
		switch (node._type) {
			case NodeType.text:
				// Handle different cycle types for text nodes
				switch (cycleType) {
					case CycleType.list:
						element = availableElements.length ? availableElements[0] : node._elements[node._elements.length - 1];
						element._visited = true;
						break;

					case CycleType.smartRandom:

						if (!availableElements.length) {
							node._elements.forEach((element) => {
								element._visited = false;
							});
						}
						availableElements = availableElements.length ? availableElements : node._elements;
						let sRnd = availableElements.length > 1 ? Math.floor(Math.random() * availableElements.length) : 0;
						element = availableElements[sRnd];
						element._visited = true;
						break;

					case CycleType.random:
						let rnd = node._elements.length > 1 ? Math.floor(Math.random() * node._elements.length) : 0;
						element = node._elements[rnd];
						element._visited = true;
						break;

					case CycleType.loop:
						// Reset visited status if no available elements
						if (!availableElements.length) {
							node._elements.forEach((element) => {
								element._visited = false;
							});
						}

						availableElements = availableElements.length ? availableElements : node._elements;
						element = availableElements[0];
						element._visited = true;
						break;
				}
				break;

			case NodeType.choices:
				// Handling for node type 'choices' can be added here if needed
				break;
		}

		// Return the selected element or null if no available elements
		return element;
	}

	/**
	 * Retrieves a specific element from a given node based on the element ID.
	 *
	 * @param {string} nodeId - The ID of the node containing the desired element.
	 * @param {string} elementId - The ID of the element to retrieve.
	 * @returns {Object|null} - The specified element if found, or null if not found.
	 */
	getNodeElement(nodeId, elementId) {
		// Retrieve the specified node using the provided nodeId
		const node = this.getNode(nodeId);

		// Filter the elements of the node based on the provided elementId
		const matchingElements = node._elements.filter((el) => {
			return el._id === elementId;
		});

		// Return the first matching element if found, or null if not found
		return matchingElements.length > 0 ? matchingElements[0] : null;
	}

	/**
	 * Retrieves available choices for a specified node or the currently selected node.
	 * Choices are determined based on the presence of special markers and visited status.
	 *
	 * @param {string|null} nodeId - The ID of the node for which to retrieve available choices. If null, uses the currently selected node.
	 * @returns {Array} - An array of available elements (choices) for the specified node.
	 */
	getAvailableChoices(nodeId) {
		// If nodeId is not provided, use the currently selected node
		nodeId = nodeId || this._selectedNodeId;

		// Retrieve the specified node
		const node = this.getNode(nodeId);

		// Filter the elements of the node to find available choices
		let availableElements = node._elements.filter((nodeElement) => {
			// Check if the nodeElement contains a special marker indicating no more choices
			const content = this.getOriginalText(nodeElement);
			const ifNoMoreRegExp = /\[\+\]/gi;
			const ifNoMoreBlocks = content.match(ifNoMoreRegExp);

			//Check if the content is empty
			if (nodeElement._type === NodeType.text || nodeElement._type === NodeType.choices) {
				const text = this.parsedText(nodeElement, false);
				const isEmpty = text.length === 0 && !nodeElement._visited;
				if (isEmpty) {
					nodeElement._visited = true;
					nodeElement._wasHiddenBecauseEmpty = true;
				} else if (nodeElement._wasHiddenBecauseEmpty && text.length > 0) {
					nodeElement._visited = false;
					nodeElement._wasHiddenBecauseEmpty = false;
				}
			}

			// If the marker is present, mark the nodeElement as 'ifNoMore' and visited
			if (ifNoMoreBlocks && ifNoMoreBlocks.length > 0) {
				nodeElement._ifNoMore = true;
				nodeElement._visited = true;
			}

			// Return elements that are not visited
			return !nodeElement._visited;
		});

		// If no available choices, include elements marked as 'ifNoMore'
		if (!availableElements.length) {
			availableElements = node._elements.filter((element) => {
				return element._ifNoMore;
			});
		}

		// Return the array of available elements (choices)
		return availableElements;
	}

	// ███████ NODE CONTENT █████████████████████████████████████

	/**
	 * Retrieves the content of a node element for the specified locale code.
	 * If the element is not translatable, it retrieves the content from the main language.
	 *
	 * @param {Object} nodeElement - The node element for which to retrieve content.
	 * @param {string} [localeCode=this._locale] - The locale code indicating the language for which to retrieve content.
	 * @returns {Object|null} - The content object for the specified locale, or null if the content is not found.
	 */
	getLocalizedContent(nodeElement, localeCode = this._locale) {
		// If the node element is not provided, return null
		if (!nodeElement) {
			return null;
		}

		let content = null;

		// Get the node associated with the node element
		const node = this.getNode(nodeElement._nodeId);

		// If the node is not translatable, get the content from the main language
		if (node && !node._translatable && !Homer._project._mainLocale._code === localeCode) {
			return this.getLocalizedContent(nodeElement, Homer._project._mainLocale._code);
		}

		// Iterate through localized contents to find content for the specified locale code
		if (nodeElement._localizedContents !== undefined) {
			nodeElement._localizedContents.forEach((localizedContent) => {
				if (localizedContent._localeCode === localeCode) {
					content = localizedContent;

					// If content is not found for the specified locale and the main locale is different, retry with the main locale
					if ((!content || !content._text.length) && !Homer._project._mainLocale._code === localeCode) {
						content = this.getLocalizedContent(nodeElement, Homer._project._mainLocale._code);
						content._notTranslated = true;
					} else {
						content._notTranslated = false;
					}
				}
			});
		}

		// Return the content object for the specified locale or null if not found
		return content;
	}

	/**
	 * Retrieves the original text content of a node element for the specified locale code.
	 *
	 * @param {Object} element - The node element for which to retrieve original text content.
	 * @param {boolean} [cleaned=false] - A flag indicating whether to clean HTML tags from the content.
	 * @param {boolean} [resolveVariables=false] - A flag indicating whether to resolve variables in the content.
	 * @param {string} [localeCode=this._locale] - The locale code indicating the language for which to retrieve content.
	 * @returns {string} - The original text content of the node element.
	 */
	getOriginalText(element, cleaned = false, resolveVariables = false, localeCode = this._locale) {
		// Get the content object for the specified locale code
		const content = this.getLocalizedContent(element, localeCode);
		let contentText = content._text;

		// Clean HTML tags from the content if the 'cleaned' flag is set
		if (cleaned) {
			contentText = HomerParser.stripHtml(contentText);
		}

		// Resolve variables in the content if the 'resolveVariables' flag is set
		if (resolveVariables) {
			// Resolve global variables
			const globalVariables = HomerParser.findGlobalVariables(contentText);
			if (globalVariables) {
				globalVariables.forEach((v) => {
					contentText = contentText.replace(v, "Homer._globalVars." + v.replace("$", ""));
				});
			}

			// Resolve local variables
			const localVariables = HomerParser.findLocalVariables(contentText);
			if (localVariables) {
				localVariables.forEach((v) => {
					contentText = contentText.replace(v, "Homer._localVars." + v.replace("%", ""));
				});
			}
		}

		// Return the original text content of the node element
		return contentText;
	}

	/**
	 * Retrieves the parsed text content of a node element or the available node element if not provided.
	 *
	 * @param {Object} [element=null] - The node element for which to retrieve parsed text content.
	 * @param {boolean} [force_eval=false] - A flag indicating whether to force the evaluation of variables.
	 * @returns {string} - The parsed text content of the node element.
	 */
	getParsedText(element = null, force_eval = false) {
		// If the element is not provided, get the available node element
		element = element || window.Homer.getAvailableNodeElement();

		// Get the parsed text content using the parsedText function
		let parsedText = this.parsedText(element, force_eval);

		// Remove leading and trailing <br> tags and spaces
		parsedText = parsedText.replace(/^(\ ?<br( \/)?>\ ?)+|(\ ?<br( \/)?>\ ?)+$/g, "");

		// Return the parsed text content of the node element
		return parsedText;
	}

	// ███████ CONNECTIONS █████████████████████████████████████

	/**
	 * Retrieves the available connection for the current node based on its type and elements.
	 *
	 * @param {string} [elementId=null] - The ID of the current node element, applicable for choices and conditions.
	 * @returns {Object} - The available connection object for the current node.
	 */
	getAvailableConnections(elementId = null) {
		const node = this.getNode();
		let availableConnection = null;
		// Get available elements (not visited)
		let availableElements = node._elements.filter(element => !element._visited);
		let possibleElement = null;

		switch (node._type) {
			case NodeType.start:
			case NodeType.text:
			case NodeType.note:
			case NodeType.layout:
				// For start, text, note, and layout nodes, take the first connection if available
				if (node._connections.length) {
					availableConnection = node._connections[0];
				}
				break;

			case NodeType.subFlow:
				if (node._connections.length) {
					let subFlow = HomerParser.activeSubFlows.filter(sf => sf.nodeId === node._id);
					if (subFlow.length === 0) {
						availableConnection = node._connections.filter(conn => conn._type === NodeType.subFlow);
						if (availableConnection.length) {
							availableConnection = availableConnection[0];
							// HomerParser.activeSubFlows.unshift(node._id);
							subFlow = {flowId: this._selectedFlowId, nodeId: node._id};
							HomerParser.activeSubFlows.unshift(subFlow);
						}
					} else {
						HomerParser.activeSubFlows.shift();
						availableConnection = node._connections.filter(conn => conn._type !== NodeType.subFlow)[0];
					}
				}
				break;

			case NodeType.choices:
				// For choices nodes, get the connection based on the provided ElementId
				if (availableElements) {
					availableConnection = this.getConnectionsByElementId(node, elementId);
				}
				break;

			case NodeType.condition:
				// For condition nodes, evaluate conditions and get the connection if true
				node._elements.forEach((element) => {
					const condition = this.getOriginalText(element, true, true);
					const result = eval(condition);
					if (result && !availableConnection) {
						availableConnection = this.getConnectionsByElementId(node, element._id);
					}
				});

				// If no true condition, get the failed connection
				if (!availableConnection) {
					availableConnection = this.getFailedConnection(node);
				}
				break;

			case NodeType.variables:
				// For variables nodes, parse text and take the first connection if available
				node._elements.forEach((element) => {
					this.parsedText(element);
				});
				if (node._connections.length) {
					availableConnection = node._connections[0];
				}
				break;

			case NodeType.random:
				// For random nodes, choose a random connection
				const rnd = Math.floor(Math.random() * node._connections.length);
				availableConnection = node._connections[rnd];
				break;

			case NodeType.sequence:
				// For sequence nodes, handle different cycle types
				switch (node._cycleType) {
					case CycleType.list:

						// For list cycle, get the first available element and its connection
						possibleElement = availableElements[0];
						if (possibleElement) {
							possibleElement._visited = true;
							availableConnection = this.getConnectionsByElementId(node, possibleElement._id);
						} else {
							// If no available element, get the failed connection or the last element's connection
							const failedConnection = this.getFailedConnection(node);
							if (failedConnection) {
								availableConnection = failedConnection;
							} else {
								availableConnection = this.getConnectionsByElementId(node, node._elements[node._elements.length - 1]._id);
							}
						}
						break;

					case CycleType.loop:
						// For loop cycle, get the first available element and its connection or reset visited elements
						possibleElement = node._elements.filter(element => !element._visited)[0];
						if (possibleElement) {
							possibleElement._visited = true;
							availableConnection = this.getConnectionsByElementId(node, possibleElement._id);
						} else {
							node._elements.forEach((element) => {
								element._visited = false;
								availableConnection = this.getConnectionsByElementId(node, node._elements[0]._id);
							});
						}
						break;

					case CycleType.random:
						// For random cycle, choose a random element and its connection
						const rnd = Math.floor(Math.random() * node._elements.length);
						possibleElement = node._elements[rnd];
						availableConnection = this.getConnectionsByElementId(node, possibleElement._id);
						break;

					case CycleType.smartRandom:
						// For smart random cycle, handle available elements and choose a random element and its connection
						if (!availableElements.length) {
							const failedConnection = this.getFailedConnection(node);
							if (failedConnection) {
								availableConnection = failedConnection;
								break;
							} else {
								node._elements.forEach((element) => {
									element._visited = false;
								});

								availableElements = node._elements.filter(element => !element._visited);
							}
						}

						const sRnd = availableElements.length > 1 ? Math.floor(Math.random() * availableElements.length) : 0;
						possibleElement = availableElements[sRnd];
						availableConnection = this.getConnectionsByElementId(node, possibleElement._id);
						break;
				}
				break;

			case NodeType.jumpToNode:
				// For jump to node, set the selected flow and node, no connection is returned
				this._selectedFlowId = node._jumpTo.flowId;
				this._selectedNodeId = node._jumpTo.nodeId;
				availableConnection = null;
				break;
		}

		return availableConnection;
	}

	/**
	 * Retrieves the connection associated with a specific node element ID.
	 *
	 * @param {Object} node - The current node object.
	 * @param {string} nodeElementId - The ID of the node element for which the connection is sought.
	 * @returns {Object} - The connection object associated with the specified node element ID.
	 */
	getConnectionsByElementId(node, nodeElementId) {
		let c = null;

		// Iterate through connections to find the one with the specified node element ID
		node._connections.forEach((connection) => {
			if (connection._nodeElementId === nodeElementId) {
				c = connection;
			}
		});

		return c;
	}

	/**
	 * Retrieves the connection associated with a failed condition in the provided node.
	 *
	 * @param {Object} node - The current node object.
	 * @returns {Object} - The connection object associated with the failed condition, or null if not found.
	 */
	getFailedConnection(node) {
		let c = null;

		// Iterate through connections to find the one with the failed condition type
		node._connections.forEach((connection) => {
			if (connection._type === NodeType.failCondition) {
				c = connection;
			}
		});

		return c;
	}

	// ███████ ACTORS █████████████████████████████████████

	/**
	 * Retrieves the actor associated with the specified node ID or the currently selected node ID.
	 *
	 * @param {string} nodeId - The ID of the node for which the actor is sought. Defaults to the currently selected node ID.
	 * @returns {Object} - The actor object associated with the specified node ID or null if not found.
	 */
	getNodeActor(nodeId = this._selectedNodeId) {
		let a = null;

		// Get the node object using the provided or default node ID
		const node = this.getNode(nodeId);

		// Retrieve the actor ID from the node and find the corresponding actor object
		const actorId = node._actorId;
		this._project._actors.forEach((actor) => {
			if (actor._id === actorId) {
				a = actor;
			}
		});

		return a;
	}

	getActorByUid(uid) {
		let a = null;
		this._project._actors.forEach((actor) => {
			if (actor._uid === uid) {
				a = actor;
			}
		});
		return a;
	}

	// ███████ NODE METADATA █████████████████████████████████████

	/**
	 * Retrieves metadata information by the specified ID.
	 *
	 * @param {string} id - The ID of the metadata to retrieve.
	 * @returns {Object} - The metadata object with the specified ID, or null if not found.
	 */
	getMetadataById(id) {
		let metadata = null;

		// Iterate through metadata to find the one with the specified ID
		this._project._metadata.forEach((meta) => {
			if (meta._id === id) {
				metadata = meta;
			}
		});

		return metadata;
	}

	/**
	 * Retrieves metadata value information by the specified metadata value ID.
	 *
	 * @param {string} metadataValueId - The ID of the metadata value to retrieve.
	 * @returns {Object} - The metadata value object with the specified ID, or null if not found.
	 */
	getMetadataValueById(metadataValueId) {
		let metadataValue = null;

		// Iterate through metadata to find the metadata value with the specified ID
		this._project._metadata.forEach((meta) => {
			meta._values.forEach((metaValue) => {
				if (metaValue._id === metadataValueId) {
					metadataValue = metaValue;
				}
			});
		});

		return metadataValue;
	}

	/**
	 * Retrieves metadata information by the specified metadata value ID.
	 *
	 * @param {string} metadataValueId - The ID of the metadata value associated with the metadata.
	 * @returns {Object} - The metadata object associated with the specified metadata value ID, or null if not found.
	 */
	getMetadataByMetadataValueId(metadataValueId) {
		// Retrieve the metadata value using the provided metadata value ID
		const metadataValue = this.getMetadataValueById(metadataValueId);

		// If the metadata value is found, retrieve the associated metadata using its metadata ID
		if (metadataValue) {
			const metadata = this.getMetadataById(metadataValue._metadataId);
			return metadata;
		}

		// Return null if metadata value is not found
		return null;
	}

	/**
	 * Retrieves metadata information associated with a specified node.
	 *
	 * @param {string} nodeId - The ID of the node for which metadata information is to be retrieved.
	 * @returns {Array} - An array of objects containing metadata information for the specified node.
	 *                   Each object includes metadata name, metadata value, metadata value UID, icon, and ID.
	 */
	getNodeMetadata(nodeId = null) {
		// Retrieve the node using the provided node ID
		const node = this.getNode(nodeId);

		// Initialize an array to store metadata information for the node
		const nodeMetadata = [];

		// Iterate through metadata values associated with the node
		node._metadata.forEach((metadataValueId) => {
			// Retrieve metadata value using the metadata value ID
			const metadataValue = this.getMetadataValueById(metadataValueId);

			// Retrieve metadata information using the associated metadata value ID
			const metadata = this.getMetadataByMetadataValueId(metadataValueId);

			// Add metadata information to the nodeMetadata array
			nodeMetadata.push({
				metadata        : metadata._name,
				metadataValue   : metadataValue._value,
				metadataValueUID: metadataValue._uid,
				icon            : metadataValue._icon,
				id              : metadataValue._id
			});
		});

		// Return the array of metadata information for the specified node
		return nodeMetadata;
	}

	getNodeMetaByMetaUID(metaUID, nodeId = null) {
		let nMeta = null;
		const nodeMeta = this.getNodeMetadata(nodeId);
		nodeMeta.forEach(meta => {
			if (meta._uid === metaUID) {
				nMeta = meta;
			}
		});
		return nMeta;
	}

	// ███████ LABELS █████████████████████████████████████

	/**
	 * Retrieves the labels defined in the project.
	 *
	 * @returns {Array} - An array of label objects containing information about labels in the project.
	 */
	getLabels() {
		// Return the array of label objects defined in the project
		return this._project._labels;
	}

	/**
	 * Retrieves the text content of a label based on its key and locale.
	 *
	 * @param {string} key - The key identifying the label.
	 * @param {string} [locale=this._locale] - The locale code for which to retrieve the label text.
	 * @returns {string | null} - The text content of the label or null if the label is not found.
	 */
	getLabel(key, locale = this._locale) {
		let label = null;

		// Find the label object with the specified key
		this._project._labels.forEach((l) => {
			if (l._key === key) {
				label = l;
			}
		});

		// If the label is found, retrieve its text content based on the specified locale
		if (label != null) {
			let content = this.getLocalizedContent(label, locale);
			return content._text;
		} else {
			// Return null if the label is not found
			return null;
		}
	}
}

/**
 * Class representing different types of variables.
 */
class VariableType {
	/**
	 * Represents a boolean variable type.
	 * @type {string}
	 */
	static bool = "bool";

	/**
	 * Represents a string variable type.
	 * @type {string}
	 */
	static string = "string";

	/**
	 * Represents an integer variable type.
	 * @type {string}
	 */
	static int = "int";

	/**
	 * Represents a float variable type.
	 * @type {string}
	 */
	static float = "float";

	/**
	 * Represents a fixed variable type.
	 * @type {string}
	 */
	static fixed = "fixed";

	/**
	 * Represents a separator variable type.
	 * @type {string}
	 */
	static separator = "separator";
}

/**
 * Class representing different types of nodes.
 */
class NodeType {
	/**
	 * Represents a Start node type.
	 * @type {string}
	 */
	static start = "Start";

	/**
	 * Represents a Text node type.
	 * @type {string}
	 */
	static text = "Text";

	/**
	 * Represents a Note node type.
	 * @type {string}
	 */
	static note = "Note";

	/**
	 * Represents a Choice node type.
	 * @type {string}
	 */
	static choices = "Choice";

	/**
	 * Represents a Variables node type.
	 * @type {string}
	 */
	static variables = "Variables";

	/**
	 * Represents a Condition node type.
	 * @type {string}
	 */
	static condition = "Condition";

	/**
	 * Represents a FailCondition node type.
	 * @type {string}
	 */
	static failCondition = "FailCondition";

	/**
	 * Represents a Random node type.
	 * @type {string}
	 */
	static random = "Random";

	/**
	 * Represents a Sequence node type.
	 * @type {string}
	 */
	static sequence = "Sequence";

	/**
	 * Represents a JumpToNode node type.
	 * @type {string}
	 */
	static jumpToNode = "JumpToNode";

	/**
	 * Represents a Layout node type.
	 * @type {string}
	 */
	static layout = "Layout";

	/**
	 * Represents a subFlow node type.
	 * @type {string}
	 */
	static subFlow = "SubFlow";

	/**
	 * Represents a Label node type.
	 * @type {string}
	 */
	static label = "Label";
}

/**
 * Class representing different cycle types.
 */
class CycleType {
	/**
	 * Represents a List cycle type.
	 * @type {string}
	 */
	static list = "List";

	/**
	 * Represents a Loop cycle type.
	 * @type {string}
	 */
	static loop = "Loop";

	/**
	 * Represents a Random cycle type.
	 * @type {string}
	 */
	static random = "Random";

	/**
	 * Represents a Smart Random cycle type.
	 * @type {string}
	 */
	static smartRandom = "Smart Random";

	/**
	 * Represents a None cycle type.
	 * @type {null}
	 */
	static none = null;
}
