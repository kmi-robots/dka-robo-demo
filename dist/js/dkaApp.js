
angular.module('dkaApp', ['ui.bootstrap','swd.inspector-gadget','chart.js'
])	

.config(['ChartJsProvider', function (ChartJsProvider) {
    // Configure all charts
    ChartJsProvider.setOptions({
      // responsive: false,
	// maintainAspectRatio: false,
    scaleOverride: false,
	scaleOverlay: false,
    scaleSteps: 5,
    scaleStepWidth: 1,
    scaleStartValue: 0
    });
    
  }])
  
.controller('dkaController', ['$scope','$interval','$sce', '$http','$timeout','$window', dkaController])
.controller('indexController', ['$scope','$interval','$sce', '$http','$timeout','$window', indexController])


function indexController($scope,$interval,$sce,$http,$timeout,$window) {
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
function dkaController($scope,$interval,$sce,$http,$timeout,$window){
	
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
	
	var randomBehaviourPromise;
	
	// methods to periodically check the status of the plan
	$scope.startRandomBehaviour = function() {
	      // stops any running interval to avoid two intervals running at the same time
	      $scope.stopRandomBehaviour(); 
      
	      // store the interval promise
	      randomBehaviourPromise = $interval($scope.actRandomly, 4000);
	};
	
	// stops the interval
	$scope.stopRandomBehaviour = function() {
	      $interval.cancel(randomBehaviourPromise);
	};
	
	// used to monitor the plan execution, and to stop the monitoring when it's required
	var planExecutionMonitoringPromise;
	
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
		$interval(cycle, 2000);
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

	function cycle() {
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
	
	// TODO load them from somewhere else
	// queries are not compliant with URLs
	// $scope.queries = [
// 		{'name':'Query 1',
// 		'value': 'select ?room ?temp where {graph ?expiryDateInMs { VALUES(?room) { ( <http://data.open.ac.uk/kmi/location/Podium> ) (<http://data.open.ac.uk/kmi/location/MarkBucks>) } ?room <http://data.open.ac.uk/kmi/robo/hasTemperature> ?temp. } }'},
// 		{ 'name': 'Query 2',
// 		  'value' : 'SELECT ?room ?temp WHERE { graph ?expiryDateInMs { VALUES(?room) {(location:Room20 ) (location:Room22)}.  ?room robo:hasTemperature ?temp.  }}'
// 	    },
// 		{'name':'Query 3',
// 		 'value':'SELECT ?room ((?temp+?h)/?ppl) AS ?comfort) WHERE { graph ?g { ?room robo:hasPeopleCount ?ppl }.  graph ?g1 {?room robo:hasHumidity ?h }. graph ?g2 {?room robo:hasTemperature ?temp }. graph ?g3 {?room a location:MeetingRoom } } ORDER BY DESC(?t) LIMIT 1	'
// 		},
// 		{ 	'name':'Query 4',
// 			'value':'SELECT ?room ((?temp+?h)/?ppl) AS ?comfort) WHERE { graph ?g { VALUES(?room) {(location:Room22) (location:Podium)}. ?room robo:hasPeopleCount ?ppl }.  graph ?g1 { VALUES(?room) {(location:Room22) (location:Podium)}. ?room robo:hasHumidity ?h }. graph ?g2 { VALUES(?room) {(location:Room22) (location:Podium)}. ?room robo:hasTemperature ?temp }.} ORDER BY DESC(?t) LIMIT 1 '
// 		}];
	
	$scope.results = false;
	$scope.lastQueryPerformed = "";
	$scope.lengthOfLastPlanIssuedByUser = 0;
	$scope.isCurrentPlanIssuedByUser = false;
	
	$scope.resetCurrentPlanInfo = function() {
		$scope.isCurrentPlanIssuedByUser = false;
		$scope.lengthOfLastPlanIssuedByUser = 0;
		$scope.lastQueryPerformed = "";
	}
	
	$scope.getPlan = function() {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/currentplan'
		}).then(function successCallback(response) {
			if($scope.createPlan(response.data)) {
				$scope.startPlanExecutionMonitoring();
			}
		}, function errorCallback(response) {
			console.log("GetPlan: " + response.status + " - " + response.statusText);
			$scope.radioModel = "Sorry, problem while sending the request. ERROR " + response.status;
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
	      // stops any running interval to avoid two intervals running at the same time
	      $scope.stopPlanExecutionMonitoring(); 
      
	      // store the interval promise
	      planExecutionMonitoringPromise = $interval($scope.updatePlanExecution, 1000);
	};
	
	// stops the interval
	$scope.stopPlanExecutionMonitoring = function() {
	      $interval.cancel(planExecutionMonitoringPromise);
	};
	
	// update the plan monitoring
	$scope.updatePlanExecution = function(){ 
		// ASK ROBOT WHAT ARE YOU DOING: to be used to update the position of the robot
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'bot/doing',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		}).then(function successCallback(response) {
			if (response.data == "") {
				$scope.terminated = true;
				for (var i = 0; i < $scope.plan.length; ++i) {
					$scope.plan[i].executing = false;
					$scope.plan[i].executed = true;
				}
				$scope.stopPlanExecutionMonitoring();
			}
			else {							
				var curIndex = response.data.index;					
				for (var i = 0; i < curIndex; ++i) {
					$scope.plan[i].executing = false;
					$scope.plan[i].executed = true;
				}
				$scope.plan[curIndex].executing = true;
				
				if($scope.isCurrentPlanIssuedByUser && curIndex == $scope.lengthOfLastPlanIssuedByUser-1) {
					$scope.performQuery($scope.lastQueryPerformed);
					$scope.resetCurrentPlanInfo();
				}
			}
		}, function errorCallback(response) {
			console.log("UpdatePlanExecution: " + response.status + " - " + response.statusText);
			$scope.radioModel = "Sorry, problem while asking what are you doing. ERROR " + response.status
		});
	}
	
	$scope.abort = function() {
		$http({
			method: 'DELETE',
			url: $scope.configfile.kbserverip+'bot/abort'
		}).then(function successCallback(response) {
			console.log("Abort succesful");
		}, function errorCallback(response) {
			console.log("Problem while aborting: " + response.status);
		});	
	}
	
	$scope.executePlanForQuery = function(query) {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'planner/plan',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			params: {query: query}
		}).then(function successCallback(response) {
			if($scope.createPlan(response.data)) {
				$scope.sendPlan(query);
			}
			else {
				$scope.resetCurrentPlanInfo();
				console.log("No plan available for query " + query);
			}
		}, function errorCallback(response) {
			if(response.status == 409) {
				console.log("The robot is busy");
				$scope.resetCurrentPlanInfo();
			}
			else {
				console.log("ExecutePlanForQuery: " + response.status + " - " + response.statusText);
				$scope.radioModel = "Sorry, problem while sending the request. ERROR " + response.status;
				$scope.resetCurrentPlanInfo();
			}
		});	
	}
	
	// create the object in the scope that
	// controls the plan monitoring div
	$scope.createPlan = function(planArray) {
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
			return true;
		}
		else return false;
	}
	
	// actually sends the plan to the KB server
	$scope.sendPlan = function(queryForPlan) {
			$http({
				method: 'GET',
				url: $scope.configfile.kbserverip+'bot/send',
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				params: {query: queryForPlan}
			}).then(function successCallback(response) {
				$scope.stopPlanExecutionMonitoring();
				$scope.terminated = false;
				$scope.startPlanExecutionMonitoring();
			}, function errorCallback(response) {
				console.log("SendPlan: " + response.status + " - " + response.statusText);
				$scope.radioModel = "Sorry, problem while sending the request. ERROR " + response.status;
				$scope.resetCurrentPlanInfo();
			});
		}
	
	$scope.queryServer = function(){	
		// whatever happens, first abort
		$scope.abort();
		// then tries to send the actual plan
		$scope.isCurrentPlanIssuedByUser = true;
		$scope.executePlanForQuery($scope.radioModel);
		$scope.lastQueryPerformed = $scope.radioModel;
	}
	
	$scope.queryResults = {
		show:false,
		keys:[],
		results:[],
	};
	
	$scope.performQuery = function(query) {
		$http({
			method: 'GET',
			url: $scope.configfile.kbserverip+'query',
			headers: {'Content-Type': 'application/x-www-form-urlencoded','Accept':'application/json'},
			params: {query: query}
		}).then(function successCallback(response) {
			$scope.updateResults(response.data);
		}, function errorCallback(response) {
			console.log("PerformQuery: " + response.status + " - " + response.statusText);
			$scope.radioModel = "Sorry, problem while sending the reuqest for query. ERROR " + response.status;
			$scope.resetCurrentPlanInfo();
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
}	


