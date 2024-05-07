class HomerBasicUsageSample {
	
	static HomerProjectNameAndExtension = "projectData/homer.json";
	static watchDog = 0;
	static container = $("#container");
	
	static start() {
		const HomerTest = new HomerParser(this.HomerProjectNameAndExtension, null, () => {
			HomerBasicUsageSample.container.empty();
			console.debug("Project Name:", HomerTest._project._name);
			
			HomerBasicUsageSample.container.append("Project Name: " + HomerTest._project._name);
			HomerBasicUsageSample.container.append("<br><br>");
			
			/**
			 * Print project locale
			 */
			console.debug("-----------------------------------");
			console.debug("Project Locale:");
			console.debug("-----------------------------------");
			HomerBasicUsageSample.container.append("<br><br>-----------------------------------<br>");
			HomerBasicUsageSample.container.append("Project Locale:");
			HomerBasicUsageSample.container.append("<br>-----------------------------------<br>");
			
			HomerTest._project._availableLocale.forEach((locale) => {
				console.debug(locale._desc, locale._code);
				HomerBasicUsageSample.container.append(locale._desc + " -> " + locale._code);
				HomerBasicUsageSample.container.append("<br>");
			});
			
			/**
			 * Print project Actors
			 */
			console.debug("-----------------------------------");
			console.debug("Project Actors:");
			console.debug("-----------------------------------");
			HomerBasicUsageSample.container.append("<br><br>-----------------------------------<br>");
			HomerBasicUsageSample.container.append("Project Actors:");
			HomerBasicUsageSample.container.append("<br>-----------------------------------<br>");
			
			HomerTest._project._actors.forEach((actor) => {
				console.debug(actor._uid + " - " + actor._name, actor._isNarrator ? " (Narrator)" : "");
				HomerBasicUsageSample.container.append(actor._uid + " - " + actor._name + (actor._isNarrator ? " (Narrator)" : ""));
				HomerBasicUsageSample.container.append("<br>");
			});
			
			/**
			 * Print project Global Variables from HomerVars.js
			 */
			console.debug("-----------------------------------");
			console.debug("Project Variables:");
			console.debug("-----------------------------------");
			HomerBasicUsageSample.container.append("<br><br>-----------------------------------<br>");
			HomerBasicUsageSample.container.append("Project Variables:");
			HomerBasicUsageSample.container.append("<br>-----------------------------------<br>");
			
			Object.keys(HomerVars).forEach((key) => {
				console.log(key, HomerVars[key])
				HomerBasicUsageSample.container.append(key + " = " + HomerVars[key]);
				HomerBasicUsageSample.container.append("<br>");
			});
			
			//More methods for metadata, labels in <see cref="HomerLoaderPrinter"/>
			
			// Eventually set non default locale
			//homerProject._locale = "DE";
			
			/**
			 * Get first Flow
			 */
			let flow = HomerTest._project._flows[0];
			HomerTest.start(null, flow._name);
			HomerBasicUsageSample.doNext()
			
		});
		
	}
	
	static doNext(elementId = null) {
		if (HomerBasicUsageSample.watchDog > 99) {
			console.debug("THE END - TOO MANY RECURSIONS");
			HomerBasicUsageSample.container.append("<br><br>-----------------------------------<br>");
			HomerBasicUsageSample.container.append("THE END - TOO MANY RECURSIONS");
			return;
		}
		++HomerBasicUsageSample.watchDog;
		
		let hasNext = window.Homer.nextNode(elementId);
		let flow = window.Homer.getSelectedFlow();
		let node = window.Homer.getNode();
		
		 console.debug("-----------------------------------");
		 console.debug("Selected Flow", flow._name);
		HomerBasicUsageSample.container.append("<br><br>-----------------------------------<br>");
		HomerBasicUsageSample.container.append("Selected Flow: " + flow._name);
		HomerBasicUsageSample.container.append("<br>");
		
		console.debug("Node n°" + HomerBasicUsageSample.watchDog);
		HomerBasicUsageSample.container.append("Node n° " + HomerBasicUsageSample.watchDog);
		HomerBasicUsageSample.container.append("<br><br>");
		
		if (!hasNext || node == null) {
			console.debug("THE END");
			HomerBasicUsageSample.container.append("<br><br>-----------------------------------<br>");
			HomerBasicUsageSample.container.append("THE END");
			return;
		}
		if (node !== null) {
			window.actor = Homer.getNodeActor();
			
			console.debug("Node", node._type, node._id);
			HomerBasicUsageSample.container.append("Node type: " + node._type +"<br>id: "+ node._id);
			HomerBasicUsageSample.container.append("<br>");
			
			let actorName = window.actor._name + (window.actor._isNarrator ? " (narrator)" : "");
			console.debug("Actor", actorName);
			HomerBasicUsageSample.container.append("Actor: " + actorName);
			HomerBasicUsageSample.container.append("<br>");
			
			switch (node._type) {
				
				case NodeType.text:
					console.debug("Content", window.Homer.getParsedText());
					HomerBasicUsageSample.container.append("Content: " + window.Homer.getParsedText());
					HomerBasicUsageSample.container.append("<br>");
					
					HomerBasicUsageSample.doNext();
					break;
				
				case NodeType.choices:
					
					console.debug(window.Homer.getParsedText(node._header));
					HomerBasicUsageSample.container.append("Content: " + window.Homer.getParsedText());
					HomerBasicUsageSample.container.append("<br>");
					
					let elements = window.Homer.getAvailableChoices();
					elements.forEach((element) => {
						let choiceText = window.Homer.getParsedText(element);
						console.debug("Choice", choiceText);
						HomerBasicUsageSample.container.append("Choice: " + choiceText);
						HomerBasicUsageSample.container.append("<br>");
					});
					let element = elements[Math.floor(Math.random() * elements.length)];
					HomerBasicUsageSample.doNext(element._id);
					break;
			}
		}
	}
}
