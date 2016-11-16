// STUFF TO CHECK
// TODO: check why sometimes it put a check on the whole plan before performing it
// TODO: watch out. Sometimes there are discrepancies between read values displayed by the KB
// monitor, and the result of the query that updates the Results section

//angular.module('dkaApp', ['ui.bootstrap'])	  
//.controller('dkaController', ['$scope','$interval','$sce', '$http','$timeout', dkaController])
//.controller('indexController', ['$scope','$interval','$sce', '$http','$timeout','$window', indexController])

//.config(['ChartJsProvider', function (ChartJsProvider) {
//     // Configure all charts
//     ChartJsProvider.setOptions({
//       // responsive: false,
// 	// maintainAspectRatio: false,
//     scaleOverride: false,
// 	scaleOverlay: false,
//     scaleSteps: 5,
//     scaleStepWidth: 1,
//     scaleStartValue: 0
//     });
//
//   }])

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
						alert("STOOP");
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
		terminated:true,
		issuedByUser:false,
		generatingQuery:"",
		fromRandomBehaviour:true
	};
	
	// random robot behaviour
	$scope.getRandomNumber = function(max,min) {
		return Math.floor(Math.random() * max) + min;
	}
	
	$scope.actRandomly = function() {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/isbusy'
		}).then(function successCallback(response) {
			if(response.data == "false") {
				var randomQuery = $scope.buildRandomQuery();
				$scope.isCurrentPlanIssuedByUser = false;
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
	

	
	// //methods to periodically check the status of the plan
	// $scope.startRandomBehaviour = function() {
	//       // stops any running interval to avoid two intervals running at the same time
	// 	  console.log("[startRandomBehaviour] stopping random behaviour");
	// 	  $scope.stopRandomBehaviour();
	// 	  console.log("[startRandomBehaviour] random behaviour stopped");
	//       	  while($scope.performingRandomBehaviour) {
	// 		  console.log($scope.performingRandomBehaviour);
	//       	  }
	//   	  console.log("[startRandomBehaviour] random behaviour stop effective");
	//
	//       // store the interval promise
	//       $scope.randomBehaviourPromise = $interval($scope.actRandomly, 4000);
	// 	  $scope.performingRandomBehaviour = true;
	// };
	//
	// //stops the interval
	// $scope.stopRandomBehaviour = function() {
	//       $interval.cancel($scope.randomBehaviourPromise);
	// 	  $scope.performingRandomBehaviour = false;
	// };
	

	
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
		// $scope.startRandomBehaviour();
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
		$scope.lengthOfLastPlanIssuedByUser = 0;
		$scope.lastQueryPerformed = "";
		$scope.queryResults.show = false;
		$scope.queryResults.keys = [];
		$scope.queryResults.results = [];
		$scope.plan = []
	}
	
	$scope.getPlan = function() {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/currentplan'
		}).then(function successCallback(response) {
			if($scope.createPlan(response.data)) {
				// is the plan has been all executed, then don't show it
				$scope.startPlanExecutionMonitoring();
			}
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
		 console.log("[startPlanExecutionMonitoring]");
	      // stops any running interval to avoid two intervals running at the same time
		 console.log("[startPlanExecutionMonitoring] calling stopPlanExecutionMonitoring");			
		 $scope.stopPlanExecutionMonitoring();
		 console.log("[startPlanExecutionMonitoring] called stopPlanExecutionMonitoring");
		 while(!$scope.monitoringStopped) {
			$timeout(function callAtTimeout() {
			 	console.log("[startPlanExecutionMonitoring] Timeout occurred");
			},200);
		 }
		 console.log("[startPlanExecutionMonitoring] stopPlanExecutionMonitoring effective");
      
	      // store the interval promise
	      planExecutionMonitoringPromise = $interval($scope.updatePlanExecution, 1000);
		  $scope.monitoringStopped = false;
	};
	
	// stops the interval
	$scope.stopPlanExecutionMonitoring = function() {
		console.log("[stopPlanExecutionMonitoring]");
	    $interval.cancel(planExecutionMonitoringPromise);
		$scope.monitoringStopped = true;
		//$scope.resetPlan();
	};
	
	// update the plan monitoring
	$scope.updatePlanExecution = function(){ 
		// console.log("[updatePlanExecution]");
		// ASK ROBOT WHAT ARE YOU DOING: to be used to update the position of the robot
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/doing',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).then(function successCallback(response) {
			// console.log("[updatePlanExecution] received response: ");
			// console.log(response)
			
			// no actions left in the plan queue
			if (response.data == "") {
				//console.log("[updatePlanExecution] doing nothing");
				$scope.terminated = true;
				for (var i = 0; i < $scope.plan.length; ++i) {
				 	$scope.plan[i].executing = false;
				 	$scope.plan[i].executed = true;
				}
			}
			else {
				//console.log("[updatePlanExecution] doing:");
				//console.log(response);						
				var curIndex = response.data.index;
				//console.log("curIndex " + curIndex);
				//console.log("lengthOf " + $scope.lengthOfLastPlanIssuedByUser);			
				for (var i = 0; i < curIndex; ++i) {
					$scope.plan[i].executing = false;
					$scope.plan[i].executed = true;
				}
				$scope.plan[curIndex].executing = true;
				
				// it means that the plan has terminated
				//if($scope.isCurrentPlanIssuedByUser && curIndex == $scope.lengthOfLastPlanIssuedByUser-1) {
					//$scope.performQuery($scope.lastQueryPerformed);
					//$scope.isCurrentPlanIssuedByUser = false;
					//$scope.startRandomBehaviour();
				//}
			}
		}, function errorCallback(response) {
			console.log("UpdatePlanExecution: " + response.status + " - " + response.statusText);
		});
	}
	
	$scope.$watch(
		function(scope) { return scope.terminated; }, 
		function(newValue,oldValue) {
			if($scope.isCurrentPlanIssuedByUser && $scope.terminated == true) {
				$timeout(function callAtTimeout() {
				 	console.log("[watch] Timeout occurred");
				},1500).then(function() {
						$scope.performQuery($scope.lastQueryPerformed);
				});
				}
			});
	
	$scope.executePlanForQuery = function(query) {
		console.log("[executePlanForQuery]: " + query);
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'planner/plan',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			params: {query: query}
		}).then(function successCallback(response) {
			if($scope.createPlan(response.data)) {
				$scope.sendPlan(query);
				$timeout(function callAtTimeout() {
   				 	console.log("[executePlanForQuery] Timeout occurred");
				},1000);
				$scope.startPlanExecutionMonitoring();
			}
			else {
				$scope.resetPlan();
				console.log("No plan available for query " + query);
			}
		}, function errorCallback(response) {
			if(response.status == 409) {
				console.log("The robot is busy");
				$scope.resetPlan();
				// if no random behaviour, start it
			}
			else {
				console.log("ExecutePlanForQuery: " + response.status + " - " + response.statusText);
				$scope.resetPlan();
				// if no random behaviour, start it
			}
		});	
	}
	
	// create the object in the scope that
	// controls the plan monitoring div
	$scope.createPlan = function(planArray) {
		console.log("[createPlan]: ");
		console.log(planArray);
		
		if(planArray.length > 0) {
			
			if($scope.isCurrentPlanIssuedByUser) {
				$scope.lengthOfLastPlanIssuedByUser = planArray.length;
			}
			
			var planListForHtml = [];

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
	
			$scope.plan = planListForHtml;
			console.log("[createPlan] created plan: ");
			console.log($scope.plan);
			return true;
		}
		else {
			console.log("[createPlan] failed in creating the plan");
			return false;
		}
	}
	
	// actually sends the plan to the KB server
	$scope.sendPlan = function(queryForPlan) {
		console.log("[sendPlan]: " + queryForPlan);
			$http({
				method: 'GET',
				url: $scope.configfile.kbserverip+'bot/send',
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				params: {query: queryForPlan}
			}).then(function successCallback(response) {
				$scope.terminated = false;
			}, function errorCallback(response) {
				console.log("SendPlan: " + response.status + " - " + response.statusText);
				//$scope.radioModel = "Sorry, problem while sending the request. ERROR " + response.status;
				$scope.resetPlan();
			});
		}
		
		var abort = function() {
			return $http({
				method: 'DELETE',
				url: $scope.configfile.kbserverip+'bot/abort'
			});
		}
		
	$scope.abortButton = function() {
		var abortTest = abort();
		abortTest.then(function successCallback(response) {
				  		    // console.log("[abort] stopping random behaviour");
// 				  		    $scope.stopRandomBehaviour();
// 				  		    console.log("[abort] random behaviour stopped");
// 				        	while($scope.performingRandomBehaviour) {
// 				  			   console.log($scope.performingRandomBehaviour);
// 					$timeout(function callAtTimeout() {
// 				 		console.log("[abort] Timeout occurred for random behaviour");
// 					},200);
// 				        	}
// 				  	  	 	console.log("[abort] random behaviour stop effective");

				console.log("[abort] calling stopPlanExecutionMonitoring");
				$scope.stopPlanExecutionMonitoring();
				console.log("[abort] called stopPlanExecutionMonitoring");
				while(!$scope.monitoringStopped) {
					$timeout(function callAtTimeout() {
					 	console.log("[abort] Timeout occurred");
					},200);
				}
				console.log("[abort] stopPlanExecutionMonitoring effective");
				$scope.resetPlan();

				console.log("[abort] restarting random behaviour");
				//$scope.startRandomBehaviour();
			}, function errorCallback(response) {
				console.log("Problem while aborting: " + response.status);
			});
	}

	$scope.queryServer = function(){
		console.log("[queryServer] button pushed for query: " + $scope.radioModel);
		
		// then tries to send the actual plan
		//$scope.planInExecution.issuedByUser = true;
		$scope.isCurrentPlanIssuedByUser = true;

		var abortTest = abort();
		
		abortTest.then(function successCallback(response) {
					// 				  		    console.log("[abort] stopping random behaviour");
					// 				  		    $scope.stopRandomBehaviour();
					// 				  		    console.log("[abort] random behaviour stopped");
					// 				        	while($scope.performingRandomBehaviour) {
					// 				  			   console.log($scope.performingRandomBehaviour);
					// $timeout(function callAtTimeout() {
					// 				 		console.log("[abort] Timeout occurred for random behaviour");
					// },200);
					// 				        	}
					// 				  	  	 	console.log("[abort] random behaviour stop effective");


				$scope.stopPlanExecutionMonitoring();
				while(!$scope.monitoringStopped) {
					$timeout(function callAtTimeout() {
					 	console.log("[abort] Timeout occurred");
					},200);
				}
				console.log("[abort] stopPlanExecutionMonitoring effective");
				$scope.resetPlan();

				console.log("[queryServer] now can perform query from pushed button");
				$scope.lastQueryPerformed = $scope.radioModel;
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
	
	$scope.performQuery = function(query) {
		console.log("[performQuery]: " + query)
		$timeout(function callAtTimeout() {
		 	console.log("[performQuery] Timeout occurred in perform query");
		},4000);
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'query',
			headers: {'Content-Type': 'application/x-www-form-urlencoded','Accept':'application/json'},
			params: {query: query}
		}).then(function successCallback(response) {
			$scope.updateResults(response.data);
		}, function errorCallback(response) {
			console.log("PerformQuery: " + response.status + " - " + response.statusText);
			$scope.resetPlan();
		});
	}
	
	$scope.updateResults = function(data) {
		console.log("[updateResults]: " + data)
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
}	


