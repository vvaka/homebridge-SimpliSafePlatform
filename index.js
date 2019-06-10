//homebridge-platform-simplisafe
var API = require('./client/api.js');

var Accessory, Service, Characteristic, UUIDGen, User;

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  User = homebridge.user;
  homebridge.registerPlatform("homebridge-simplisafeplatform", "homebridge-simplisafeplatform", SimpliSafe, true);
}

var ss; //SimpliSafe Client

function SimpliSafe(log, config, api) {
  var platform = this;
  platform.log = log;
  platform.config = config;
  platform.accessories = {};
  ss = new API(config.SerialNumber, config.username);

  if (api) {
    platform.api = api;
    platform.api.on('didFinishLaunching', function() {
      if (platform.config.password){
        ss.login_via_credentials(config.password)
        .then(function(){
          return platform.initPlatform(false);
        });
      } else {
        ss.login_via_token(config.refresh_token)
        .then(function(){
          return platform.initPlatform(false);
        });
      }

      platform.log("Up and monitoring.");

      if (ss._refresh_token) {
        if (platform.config.password) {
          var fs = require('fs');
          var cfg = JSON.parse(fs.readFileSync(User.configPath()));
          var nPlatforms=[];
          cfg.platforms.forEach(pForm=>{
            if (pForm.platform == 'homebridge-simplisafeplatform') {
              delete pForm.password;
              pForm.refresh_token = ss._refresh_token;
            }
            nPlatforms.push(pForm);
          })
          cfg.platforms = nPlatforms;
          fs.writeFileSync(User.configPath(), JSON.stringify(cfg, null, 4));
        }
      };
    }.bind(platform));
  };
};//End of SimpliSafe Function

SimpliSafe.prototype.initPlatform = function(cached = true){
  var platform = this;
  return ss.get_Sensors(cached)
    .then(function () {
      var system = ss.sensors;
      //Add the security alarm system as a sensor;
      system[platform.config.SerialNumber] = {'type': ss.SensorTypes.SecuritySystem, 'serial': platform.config.SerialNumber, 'name': 'SimpliSafe Alarm System'}
      Object.keys(system).forEach(sensor=> {
        //found Accessory to Sensor return to continue searching and change Reachability to true
        if (platform.accessories[sensor]) return platform.accessories[sensor].updateReachability(true);
//          if (accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString() != sensor.toString()) return;
          //found new sensor add it as an accessory
          if (ss.sysVersion == 3) {
            if (![ss.SensorTypes.CarbonMonoxideSensor, ss.SensorTypes.ContactSensor, ss.SensorTypes.GlassBreakSensor, ss.SensorTypes.LeakSensor, ss.SensorTypes.MotionSensor, ss.SensorTypes.SecuritySystem, ss.SensorTypes.SmokeSensor, ss.SensorTypes.TemperatureSensor].includes(ss.sensors[sensor].type)) return;
            platform.addAccessory(platform.createAccessory(sensor), true);
          } else {
            if (![ss.SensorTypes.ContactSensor, ss.SensorTypes.SecuritySystem, ss.SensorTypes.TemperatureSensor].includes(ss.sensors[sensor].type)) return;
            platform.addAccessory(platform.createAccessory(sensor), true);
          };

      });
    })
    .catch(err=>{
      platform.log(err);
    });
};// End of initPlatform Function

SimpliSafe.prototype.createAccessory = function(sensor) {
  var platform = this;

  let newAccessory = new Accessory(ss.SensorTypes[ss.sensors[sensor].type] + ' ' + sensor.toString(), UUIDGen.generate(ss.SensorTypes[ss.sensors[sensor].type] + ' ' + sensor));
  newAccessory.reachable = true;
  newAccessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.SerialNumber, sensor)
    .setCharacteristic(Characteristic.Manufacturer, 'SimpliSafe')
    .setCharacteristic(Characteristic.Model, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Sensor'));

  switch (ss.sensors[sensor].type) {
    case ss.SensorTypes.CarbonMonoxideSensor:
      newAccessory.addService(Service.CarbonMonoxideSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Detector'));
      break;
    case ss.SensorTypes.ContactSensor:
      newAccessory.addService(Service.ContactSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Sensor'));
      break;
    case ss.SensorTypes.GlassBreakSensor:
        newAccessory.addService(Service.MotionSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Sensor'));
        break;
    case ss.SensorTypes.LeakSensor:
        newAccessory.addService(Service.LeakSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Detector'));
        break;
    case ss.SensorTypes.MotionSensor:
      newAccessory.addService(Service.MotionSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Sensor'));
      break;
    case ss.SensorTypes.SecuritySystem:
        newAccessory.addService(Service.SecuritySystem, "SimpliSafe Security System");
        break;
    case ss.SensorTypes.SmokeSensor:
      newAccessory.addService(Service.SmokeSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Detector'));
      break;
    case ss.SensorTypes.TemperatureSensor:
      newAccessory.addService(Service.TemperatureSensor, ss.SensorTypes[ss.sensors[sensor].type].replace('Sensor', ' Sensor'));
      break;
  };
  return newAccessory;
};// End createAccessory function

SimpliSafe.prototype.configureAccessory = function(accessory) {
  var platform = this;
  accessory.reachable = false; // will turn to true after validated
  platform.addAccessory(accessory);
}

SimpliSafe.prototype.addAccessory = function(accessory, publish = false){
  var platform = this;
    accessory.on('identify', (paired, callback) => {
              platform.log(accessory.displayName, 'Added!!!');
              callback();
    });

    if(accessory.getService(Service.CarbonMonoxideSensor)) {
        accessory.getService(Service.CarbonMonoxideSensor)
          .getCharacteristic(Characteristic.CarbonMonoxideDetected)
          .on('get', (callback)=>{
            platform.getState(accesory.displayName, callback);
          });
    } else if(accessory.getService(Service.ContactSensor)) {
        accessory.getService(Service.ContactSensor)
          .getCharacteristic(Characteristic.ContactSensorState)
          .on('get', (callback)=>{
            platform.getState(accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString(), callback)
          });
    } else if(accessory.getService(Service.LeakSensor)) {
        accessory.getService(Service.ContactSensor)
          .getCharacteristic(Characteristic.LeakDetected)
          .on('get', (callback)=>{
            platform.getState(accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString(), callback)
          });
    } else if (accessory.getService(Service.MotionSensor) && accessory.getService(Service.GlassBreakSensor)) {
        accessory.getService(Service.MotionSensor)
          .getCharacteristic(Characteristic.MotionDetected)
          .on('get', (callback)=>{
              platform.getState(accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString(), callback);
          });
    } else if (accessory.getService(Service.SecuritySystem)) {
        accessory.getService(Service.SecuritySystem)
          .getCharacteristic(Characteristic.SecuritySystemCurrentState)
          .on('get', (callback)=>platform.getCurrentState(callback));
        accessory.getService(Service.SecuritySystem)
          .getCharacteristic(Characteristic.SecuritySystemTargetState)
          .on('get', (callback)=>platform.getAlarmState(callback))
          .on('set', (state,callback)=>{
              platform.setAlarmtoState(state,callback);
              accessory.getService(Service.SecuritySystem)
                .setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
          });
    } else if (accessory.getService(Service.SmokeSensor)) {
        accessory.getService(Service.SmokeSensor)
          .getCharacteristic(Characteristic.SmokeDetected)
          .on('get', (callback)=>{
            platform.getState(accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString(), callback);
          });
    } else if (accessory.getService(Service.TemperatureSensor)) {
        accessory.getService(Service.TemperatureSensor)
          .getCharacteristic(Characteristic.CurrentTemperature)
          .on('get', (callback)=>{
            platform.getState(accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString(), callback);
          });
    };

    platform.accessories[accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.toString()] = accessory;

    if (publish) {
      platform.log('publishing a new platform accessory', accessory.displayName);
      platform.api.registerPlatformAccessories("homebridge-simplisafeplatform", "homebridge-simplisafeplatform", [accessory]);
    }
}// End Of Function addAccessory

SimpliSafe.prototype.getCurrentState = function(callback){
  var platform = this;
  ss.get_Alarm_State()
  .then(function(state) {
    if (state.isAlarming) {
      callback(null, Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED);
    }
    switch (state.alarmState.toString().toLowerCase()) {
        case 'home':
        case 'home_count':
          callback(null, Characteristic.SecuritySystemCurrentState.STAY_ARM);
          break;
        case 'away':
        case 'away_count':
        case 'alarm_count':
          callback(null, Characteristic.SecuritySystemCurrentState.AWAY_ARM);
          break;
        case 'off':
          callback(null, Characteristic.SecuritySystemCurrentState.DISARMED);
          break;
      };
    }, function() {
        callback(new Error('Failed to get alarm state'))
    });
}; // End Of Function getCurrentState

SimpliSafe.prototype.getState = async function(SerialNumber, callback){
  var platform = this;
  let sensors = {};
  sensors = await ss.get_Sensors(false);
    if (platform.accessories[SerialNumber].getService(Service.MotionSensor)) {
      callback(null, (sensors[SerialNumber].temp-32) * 5/9);
    } else {
      callback(null, !sensors[SerialNumber]['status']['triggered'] ? false: true);
    };
};// End of Function getState

SimpliSafe.prototype.getAlarmState = function(callback){
  var platform = this;
  ss.get_Alarm_State()
  .then(function(state) {
    switch (state.alarmState.toString().toLowerCase()) {
        case 'home':
        case 'home_count':
          callback(null, Characteristic.SecuritySystemTargetState.STAY_ARM);
          break;
        case 'away':
        case 'away_count':
        case 'alarm_count':
          callback(null, Characteristic.SecuritySystemTargetState.AWAY_ARM);
          break;
        case 'off':
          callback(null, Characteristic.SecuritySystemTargetState.DISARM);
          break;
      };
    }, function() {
        callback(new Error('Failed to get alarm state'))
    });
};// End of Function getAlarmState

SimpliSafe.prototype.setAlarmState = function(state, callback) {
  // Set state in simplisafe 'off' or 'home' or 'away'
  var platform = this;
  var ssState;
  switch (state) {
    case Characteristic.SecuritySystemTargetState.STAY_ARM:
    case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
      ssState = "home";
      break;
    case Characteristic.SecuritySystemTargetState.AWAY_ARM :
      ssState = "away";
      break;
    case Characteristic.SecuritySystemTargetState.DISARM:
      ssState = "off";
      break;
  }
  ss.set_Alarm_State(ssState)
  .then(function() {
    callback(null, state);
  }, function() {
      callback(new Error('Failed to set target state to ' + state));
  });
};// End of Function setAlarmState

// Sample function to show how developer can remove accessory dynamically from outside event
// Need to look up Accessoy Removal process....
//  this.api.unregisterPlatformAccessories("homebridge-platform-simplisafe", "homebridge-platform-simplisafe", this.accessories);

//  this.accessories = [];
