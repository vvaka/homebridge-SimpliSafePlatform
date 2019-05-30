# homebridge-simplisafe-security-system

This project is a [Homebridge] platform pluging that allows you to monitor and control your SimpliSafe alarm system with the iOS 10 Home app as well as through Siri. This project uses the its own API from several different examples out there... Major Credit goes to chowielin, nfarina and greencoder. 

To use this, you must have a working Homebridge server running in your network. 

## Screenshots
![View from the home app](/screenshots/IMG_0064.jpg?raw=true "View from the Home app.")
![Controlling alarm system](/screenshots/IMG_0065.jpg?raw=true "Controlling the alarm system.")

## Notes
- The "night" toggle in the iOS 10 Home App UI sets the alarm state to "home" in SimpliSafe. This is due to SimpliSafe not having a dedicated "night" mode.
- Usage of this plugin requires the extra $10/month online monitoring plan, since that enables the required API endpoints to control the alarm remotely.

## Installation
    npm install -g git+https://github.com/graanco/homebridge-SimpliSafePlatform.git


## Configuration
    {
	"bridge":
	{
		"name": "Homebridge",
		"username": "CD:22:3D:E3:CE:31",
		"port": 51826,
		"pin": "032-45-155"
	},
	"platforms": [
    {
      "platform" : "homebridge-platform-simplisafe",
      "name" : "SimpliSafe Client",
			"SerialNumber": "000162B9",
			"username" : "email",
			"password" : "password",
			"refresh_timer": "30" 
    }
	]
}
refresh_timer is in seconds... 

