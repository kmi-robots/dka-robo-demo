// STUFF TO CHECK
// TODO: check why sometimes it put a check on the whole plan before performing it
// TODO: watch out. Sometimes there are discrepancies between read values displayed by the KB
// monitor, and the result of the query that updates the Results section

angular.module('dkaApp', ['ui.bootstrap',
])	
.controller('dkaController', ['$scope','$interval','$sce', '$http','$timeout', dkaController])
.controller('indexController', ['$scope','$interval','$sce', '$http','$timeout','$window', indexController])

function indexController($scope,$interval,$sce,$http,$timeout,$window) {
	console.log("porcoddiaccio");
	$scope.errorUrl = "error.html";
	$scope.successUrl = "dka.html";
	
	var initialization = function() {
		return $http.get('propertyValidity.json')
		.success(function(data) {
			$scope.configfile = data;	
		})
		.error(function(data,status,error,config){
			console.log("Cannot load time validity: " + error);
			alert("Property file can't be read. You can't continue with the demo.");
		});
	}
	
	var init = initialization();
	init.then(function(result) {
		// check connection with KB
		var updateQuery = $scope.configfile.updatequery;

		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'query',
			headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept':'application/json'},
			params: {query: updateQuery},
			timeout:5000
		}).then(function successCallback(response) {
			console.log("KB server connection successful");
			// check connection with the Robot
			$http({
			    method: 'GET',
			    url: $scope.configfile.kbserverip+'bot/wru',
			    headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept':'application/json'},
				timeout:5000
			    	}).then(function successCallback(response) {
						console.log("Robot connection successful");
						$window.location = $scope.successUrl; 
							
			    	}, function errorCallback(response) {
			    		console.log("Sorry, the robot is not responding");
						$window.location = $scope.errorUrl; 
			    	});
		}, function errorCallback(response) {
			console.log("Problems while contacting the KB server");	
			$window.location = $scope.errorUrl;
		});
	});
}
// WATCH OUT FOR: 
// wifi name in the bot_server.py
function dkaController($scope,$interval,$sce,$http,$timeout){
	
	$scope.performingRandomBehaviour = false;
	var randomBehaviourPromise;
	// used to monitor the plan execution, and to stop the monitoring when it's required
	var planExecutionMonitoringPromise;
	$scope.monitoringStopped = false;
	$scope.results = false;
	$scope.lastQueryPerformed = "";
	$scope.lengthOfLastPlanIssuedByUser = 0;
	$scope.isCurrentPlanIssuedByUser = false;
	
	$scope.planInExecution = {
		plan:[],
		inExecution:false,
		terminated:false,
		issuedByUser:false,
		generatingQuery:"",
		fromRandomBehaviour:true
	};
	
	// random robot behaviour
	$scope.getRandomNumber = function(max,min) {
		return Math.floor(Math.random() * max) + min;
	}
	
	$scope.behaveRandomly = function() {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/isbusy'
		}).then(function successCallback(response) {
			if(response.data == "false") {
				
				$scope.stopPlanExecutionMonitoring();
				if(planExecutionMonitoringPromise != undefined) {
					while(planExecutionMonitoringPromise.$$state.status != 2) {
							$timeout(function callAtTimeout() {
								// do nothing
							},200).then(function() {
								console.log("[behaveRandomly] waiting for plan execution monitoring to stop");
					        });
			        }
			    }
				console.log("[behaveRandomly] stopPlanExecutionMonitoring effective");
				$scope.resetPlan();
				
				$scope.lastQueryPerformed = $scope.radioModel;
				$scope.planInExecution.issuedByUser = false;
				var randomQuery = $scope.buildRandomQuery();
				$scope.planInExecution.generatingQuery = randomQuery;
				$scope.executePlanForQuery(randomQuery);
			}
		}, function errorCallback(response) {
			console.log("Problem while asking if the robot is busy: " + response.status);
		});
	}
	
	$scope.buildRandomQuery = function() {
		var properties = Object.keys($scope.configfile.generalproperties);
		var randomPropertyIndex = $scope.getRandomNumber(properties.length,0);
		var randomProperty = properties[randomPropertyIndex];

		var rooms = Object.keys($scope.configfile.rooms);
		var randomRoomIndex = $scope.getRandomNumber(rooms.length,0);
		var randomRoom = rooms[randomRoomIndex];

		return "select ?room ?prop where { graph ?expiryDateInMs { VALUES(?room) {(<http://data.open.ac.uk/kmi/location/"+randomRoom+">)} ?room <http://data.open.ac.uk/kmi/robo/"+randomProperty+"> ?prop. } }";
	}
		
	//methods to periodically check the status of the plan
	$scope.startRandomBehaviour = function() {
	      // stops any running interval to avoid two intervals running at the same time
		  $scope.stopRandomBehaviour();

	      // store the interval promise
	      $scope.randomBehaviourPromise = $interval($scope.behaveRandomly, 4000);
	};

	//stops the interval
	$scope.stopRandomBehaviour = function() {
	      $interval.cancel($scope.randomBehaviourPromise);
	};
	
	// loading the property validity time file
	// TODO: this should be replaced with a call to the server that
	// serves the information about the Room-property time validity
	$scope.configfile = null;
	
	var initialization = function() {
		return $http.get('propertyValidity.json')
		.success(function(data) {
			$scope.configfile = data;
			
			// adding generalproperties to each room
			angular.forEach($scope.configfile.rooms,function(room) {
				room["properties"] = {};
				angular.forEach($scope.configfile.generalproperties,function(value,key) {
					room["properties"][key] = {};
					angular.forEach($scope.configfile.generalproperties[key],function(subvalue,subkey) {					
						room["properties"][key][subkey] = subvalue;
					});
				});
			});
		})
		.error(function(data,status,error,config){
			console.log("Cannot load time validity: " + error);
			alert("Property file can't be read. You can't continue with the demo.");
		});
	}
	
	var test = initialization();
	test.then(function(result){
		$interval(placeRobot, 1000);
		$scope.getPlan();
		updateRooms();
		$scope.startRandomBehaviour();
		$interval(updateRoomCycle, 2000);
	});
	
	function placeRobot() {
		$http({
		    method: 'GET',
		    url: $scope.configfile.kbserverip+'bot/wru',
		    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		    	}).then(function successCallback(response) {
					if($scope.configfile.map.invertaxes) {
						var x = response.data.current_position.y;
				 		var y = response.data.current_position.x;
					}
					else {
						var x = response.data.current_position.x;
				 		var y = response.data.current_position.y;
					}
					
					// used to center the image at the coordinates
					// and not the upper-left corner
					var robotImageCenterX = Math.ceil($scope.configfile.robot.style.width/2);
					var robotImageCenterY = Math.ceil($scope.configfile.robot.style.height/2);
		
					var xInPixel = $scope.configfile.map.xmultiplier*x/$scope.configfile.map.scale;
					var yInPixel = $scope.configfile.map.ymultiplier*y/$scope.configfile.map.scale;
					
					var actualXPosition = xInPixel+$scope.configfile.map.xoffset-robotImageCenterX;
					var actualYPosition = yInPixel+$scope.configfile.map.yoffset-robotImageCenterY;
					$scope.configfile.robot.style.top = actualYPosition;
					$scope.configfile.robot.style.left = actualXPosition;
							
		    	}, function errorCallback(response) {
		    		console.log("Sorry, the robot is not responding")
		    	});
	}
	
	function getURIName(uri) {
		return uri.substr(uri.lastIndexOf('/')+1)
	}

	function updateRoomCycle() {
		updateRooms();
	}
	
	function updateRooms(){
		// GET KB STATUS
		var updateQuery = $scope.configfile.updatequery;
		
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'query',
			headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept':'application/json'},
			params: {query: updateQuery}
		}).then(function successCallback(response) {
			// TODO there is information about the Activity 6
			// in the KB
			var vars = response.data.vars;
			var items = response.data.items;	
			var now = Date.now();
			
			angular.forEach(items,function(item) {

				var room = getURIName(item.room);
				var curRoom = $scope.configfile.rooms[room];
				
				if(curRoom != null) {
				
					var property = getURIName(item.prop);
					var isValidUntil = parseInt(getURIName(item.validityGraph));
				
					var value = getURIName(item.val);
				
					if(item.val.includes("^^")) {
						value = item.val.split("\^\^")[0];
					}

					var remainingTime = isValidUntil - now;
					var percentageOfRemainingTime = remainingTime/(curRoom[property]*1000);
				
					// this should never happen. 
					// only for debugging
					if(percentageOfRemainingTime > 1) {
						percentageOfRemainingTime = 1;
					}

					var transparcencyValue = percentageOfRemainingTime;

					if(remainingTime > 0) {						
						curRoom.properties[property].color = 'rgba(0, 180, 48, '+transparcencyValue+')';
						curRoom.properties[property].fontcolor = 'rgba(0, 0, 0, '+transparcencyValue+')';
						curRoom.properties[property].value = value;
						curRoom.properties[property].validity = true;
					}
					else {
						curRoom.properties[property].validity = false;
						curRoom.properties[property].value = "NV";
					}	
				}
			});
		}, function errorCallback(response) {
			console.log("UpdateRooms: " + response.status + " - " + response.statusText);
			console.log("Problems while contacting the KB server");
		});
	}


	$scope.resetPlan = function() {
		console.log("[resetPlan]");
		$scope.planInExecution.plan = [];
		$scope.planInExecution.inExecution = false;
		$scope.planInExecution.terminated = false;
		$scope.planInExecution.issuedByUser = false;
		$scope.planInExecution.generatingQuery = "";
		$scope.planInExecution.fromRandomBehaviour = true;
	}
	
	$scope.getPlan = function() {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/currentplan'
		}).then(function successCallback(response) {
			var curPlan = $scope.createPlan(response.data);

			if(curPlan.length > 0) {
				$scope.planInExecution.plan = curPlan;
				$scope.planInExecution.terminated = false;
				$scope.planInExecution.inExecution = true;
			}
			$scope.startPlanExecutionMonitoring();
			// if($scope.createPlan(response.data)) {
			// 	// is the plan has been all executed, then don't show it
			// 	$scope.startPlanExecutionMonitoring();
			// }
		}, function errorCallback(response) {
			console.log("GetPlan: " + response.status + " - " + response.statusText);
		});	
	}
	
	$scope.isRoomInvalid = function(room) {
		var invalid = true;
		angular.forEach(room.properties,function(property) {
			if(property.validity) {
				invalid = false;
			}
		});
		return invalid;
	}
	
	// methods to periodically check the status of the plan
	$scope.startPlanExecutionMonitoring = function() {
		console.log("[startPlanExecutionMonitoring] called");
	      // stops any running interval to avoid two intervals running at the same time	
		 $scope.stopPlanExecutionMonitoring();
		 
	     // store the interval promise
	     planExecutionMonitoringPromise = $interval($scope.updatePlanExecution, 1000);
		 $scope.monitoringStopped = false;
	};
	
	// stops the interval
	$scope.stopPlanExecutionMonitoring = function() {
	    $interval.cancel(planExecutionMonitoringPromise);
		$scope.monitoringStopped = true;
	};
	
	// update the plan monitoring
	$scope.updatePlanExecution = function(){ 
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/doing',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).then(function successCallback(response) {
			
			// no actions left in the plan queue
			if (response.data == "") {
				//console.log("[updatePlanExecution] terminated");
				$scope.planInExecution.terminated = true;
				$scope.planInExecution.inExecution = false;
			}
			else {					
				var curIndex = response.data.index;
			
				for (var i = 0; i < curIndex; ++i) {
					$scope.planInExecution.plan[i].executing = false;
					$scope.planInExecution.plan[i].executed = true;
				}
				$scope.planInExecution.plan[curIndex].executing = true;

			}
		}, function errorCallback(response) {
			console.log("UpdatePlanExecution: " + response.status + " - " + response.statusText);
		});
	}
	
	// watch when a plan pass from inExecution to terminated
	$scope.$watch(
		function(scope) { return scope.planInExecution.terminated; }, 
		function(newValue,oldValue) {
			console.log("[watch] " + $scope.planInExecution.terminated);
			if($scope.planInExecution.issuedByUser == true && $scope.planInExecution.terminated == true) {
				$timeout(function callAtTimeout() {
				 	console.log("[watch] Timeout occurred, performing query");
				},1200).then(function() {
					$scope.performQuery($scope.planInExecution.generatingQuery);
				});
				$timeout(function callAtTimeout() {
				 	console.log("[watch] Timeout occurred, restarting random behaviour");
				},500).then(function() {
					$scope.startRandomBehaviour();
				});
			}
		}
	);
			
	// watch
	$scope.$watch(
		function(scope) {return scope.planInExecution.inExecution},
		function(newValue,oldValue) {
			if($scope.planInExecution.inExecution == false) {
				for (var i = 0; i < $scope.planInExecution.plan.length; ++i) {
				 	$scope.planInExecution.plan[i].executing = false;
				 	$scope.planInExecution.plan[i].executed = true;
				}
			}
		}
	);
	
	$scope.executePlanForQuery = function(query) {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'planner/plan',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			params: {query: query}
		}).then(function successCallback(response) {
			var curPlan = $scope.createPlan(response.data);

			if(curPlan.length > 0) {
				$scope.planInExecution.plan = curPlan;
				$scope.sendPlan(query);
			}
			else {
				console.log("No plan available for query " + query);
				if($scope.planInExecution.issuedByUser == true) {
					alert("Sorry, no play available for the selected query.");
				}
				$scope.resetPlan();
				
				// HERE
				$scope.startRandomBehaviour();	
			}
		}, function errorCallback(response) {
			if(response.status == 409) {
				console.log("The robot is busy");
			}
			else {
				console.log("ExecutePlanForQuery: " + response.status + " - " + response.statusText);
				$scope.resetPlan();
				
				// HERE
				$scope.startRandomBehaviour();	
			}
		});	
	}
	
	// create the object in the scope that
	// controls the plan monitoring div
	$scope.createPlan = function(planArray) {
		var planListForHtml = [];
		
		if(planArray.length > 0) {
			for (index in planArray) {
				var curPlanForHtml = {};
				var actionName = planArray[index].name;
				var actionHtmlName = actionName;
				
				if(actionName == "Move") {
					actionHtmlName += " to " + planArray[index].to;
				}
				
				curPlanForHtml["name"] = actionHtmlName;
				curPlanForHtml["executed"] = false;
				curPlanForHtml["executing"] = false;
				planListForHtml.push(curPlanForHtml);
			}
		}
		return planListForHtml;
	}
	
	// actually sends the plan to the KB server
	$scope.sendPlan = function(queryForPlan) {
		console.log("[sendPlan] called");
			$http({
				method: 'GET',
				url: $scope.configfile.kbserverip+'bot/send',
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				params: {query: queryForPlan}
			}).then(function successCallback(response) {
				$scope.planInExecution.inExecution = true;
				$scope.planInExecution.terminated = false;
				$timeout(function callAtTimeout() {
   				 	console.log("[sendPlan] Timeout occurred");
				},500).then(function() {$scope.startPlanExecutionMonitoring()});
			}, function errorCallback(response) {
				console.log("SendPlan: " + response.status + " - " + response.statusText);
				$scope.resetPlan();
				
				// HERE
				$scope.startRandomBehaviour();			
			});
	}
		
	var abort = function() {
		return $http({
			method: 'DELETE',
			url: $scope.configfile.kbserverip+'bot/abort'
		});
	}
		
	$scope.abortButton = function() {
		
		// first, stop the plan execution monitoring
		$scope.stopPlanExecutionMonitoring();	
		// and get sure of that
		if(planExecutionMonitoringPromise != undefined) {		
			while(planExecutionMonitoringPromise.$$state.status != 2) {
					$timeout(function callAtTimeout() {
						// do nothing
					},200).then(function() {
						console.log("[abortButton] waiting for plan execution monitoring to stop");
			        });
	        }
	    }
		console.log("[abortButton] stopPlanExecutionMonitoring effective");
		
		// then stop the random behaviour generator
		$scope.stopRandomBehaviour();
		// and get sure of that
		if(randomBehaviourPromise != undefined) {
			while(randomBehaviourPromise.$$state.status != 2) {
					$timeout(function callAtTimeout() {
						// do nothing
					},200).then(function() {
						console.log("[abortButton] waiting for random behaviour to stop");
			        });
	        }
	    }
		console.log("[abortButton] stopRandomBehaviour effective");
		
		var abortTest = abort();
		abortTest.then(function successCallback(response) {
				$scope.resetPlan();
				// $timeout(function callAtTimeout() {
				//  	console.log("[abortButton] Timeout occurred, restarting random behaviour");
				// },4000).then(function() {
				// 	$scope.startRandomBehaviour();
				// });
			}, function errorCallback(response) {
				console.log("Problem while aborting: " + response.status);
			});
	}

	$scope.queryServer = function(){
		console.log("[queryServer] button pushed for query: " + $scope.radioModel);
		
		// first, stop the plan execution monitoring
		$scope.stopPlanExecutionMonitoring();
		// and get sure of that
		if(planExecutionMonitoringPromise != undefined) {
			
			while(planExecutionMonitoringPromise.$$state.status != 2) {
					$timeout(function callAtTimeout() {
						// do nothing
					},200).then(function() {
						console.log("[queryServer] waiting for plan execution monitoring to stop");
			        });
	        }
	    }
		console.log("[queryServer] stopPlanExecutionMonitoring effective");
		
		// then stop the random behaviour generator
		$scope.stopRandomBehaviour();
		// and get sure of that
		if(randomBehaviourPromise != undefined) {
			while(randomBehaviourPromise.$$state.status != 2) {
					$timeout(function callAtTimeout() {
						// do nothing
					},200).then(function() {
						console.log("[abortButton] waiting for random behaviour to stop");
			        });
	        }
	    }
		console.log("[abortButton] stopRandomBehaviour effective");
		
		var abortTest = abort();
		
		abortTest.then(function successCallback(response) {
				console.log("[queryServer] plan aborted");					
				console.log("[queryServer] now can perform query from pushed button");
				$scope.resetPlan();
				$scope.resetQueryResults();
				
				$scope.lastQueryPerformed = $scope.radioModel;
				$scope.planInExecution.issuedByUser = true;
				$scope.planInExecution.generatingQuery = $scope.radioModel;
				$scope.executePlanForQuery($scope.radioModel);
			}, function errorCallback(response) {
				console.log("Problem while aborting: " + response.status);
				// restart random behaviour
			});
	}
	
	$scope.queryResults = {
		show:false,
		keys:[],
		results:[],
	};
	
	$scope.resetQueryResults = function() {
		$scope.queryResults.show = false;
		$scope.queryResults.kaues = [];
		$scope.queryResults.results = [];
	}
	
	$scope.performQuery = function(query) {
		console.log("[performQuery]: " + query)

		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'query',
			headers: {'Content-Type': 'application/x-www-form-urlencoded','Accept':'application/json'},
			params: {query: query}
		}).then(function successCallback(response) {
			console.log("RESULTS");
			console.log(response.data);
			$scope.updateResults(response.data);
		}, function errorCallback(response) {
			console.log("PerformQuery: " + response.status + " - " + response.statusText);
			$scope.resetPlan();
		});
	}
	
	$scope.updateResults = function(data) {
		$scope.queryResults.show = true;
		$scope.queryResults.keys = data.vars;
		
		angular.forEach(data.items,function(item) {
			curItem = {};
			angular.forEach(item,function(value,key) {
				if(typeof value === 'string' && value.includes("/")) {
					curItem[key] = getURIName(value);
				}
				else {
					curItem[key] = value;
				}
			});
			$scope.queryResults.results.push(curItem);
		});
	}
	
	$scope.restartRandom = function() {
		$scope.startRandomBehaviour();
	}
}	


