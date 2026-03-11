#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>

#define RELAY_PIN 5

const char* WIFI_SSID = "DESKTOP-HP";
const char* WIFI_PASSWORD = "ebin522009";

const char* MQTT_SERVER = "d91cd17c19a3423588f5ebf619787991.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;

const char* MQTT_USERNAME = "energion_mqtt";
const char* MQTT_PASSWORD = "EvMqttShec1";

String stationId = "station_01";

String controlTopic = "station/station_01/control";
String dataTopic = "station/station_01/data";

WiFiClientSecure wifiClient;
PubSubClient client(wifiClient);

PZEM004Tv30 pzem(Serial2,16,17);

bool chargingActive = false;
String sessionId = "";
float maxEnergyLimit = 0;

unsigned long lastPublish = 0;

void connectWiFi()
{
  Serial.print("Connecting WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println(" connected");
}

void mqttCallback(char* topic, byte* payload, unsigned int length)
{
  String message = "";

  for (int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }

  Serial.println("MQTT Message:");
  Serial.println(message);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, message);

  String command = doc["command"];

  if (command == "START")
  {
    sessionId = doc["sessionId"].as<String>();
    maxEnergyLimit = doc["maxEnergyLimit"];

    digitalWrite(RELAY_PIN, LOW);   // RELAY ON
    chargingActive = true;

    Serial.println("Relay ON");
  }

  if (command == "STOP")
  {
    digitalWrite(RELAY_PIN, HIGH);  // RELAY OFF
    chargingActive = false;
    sessionId = "";

    Serial.println("Relay OFF");
  }
}

void connectMQTT()
{
  while (!client.connected())
  {
    Serial.println("Connecting MQTT...");

    if (client.connect(stationId.c_str(), MQTT_USERNAME, MQTT_PASSWORD))
    {
      Serial.println("MQTT connected");

      client.subscribe(controlTopic.c_str());

      Serial.println("Subscribed to control topic");
    }
    else
    {
      Serial.println("MQTT connection failed");
      delay(2000);
    }
  }
}

void publishTelemetry()
{
  float voltage = pzem.voltage();
  float current = pzem.current();
  float energy = pzem.energy();

  StaticJsonDocument<256> doc;

  doc["sessionId"] = sessionId;
  doc["kWh"] = energy;
  doc["voltage"] = voltage;
  doc["current"] = current;

  char buffer[256];
  serializeJson(doc, buffer);

  client.publish(dataTopic.c_str(), buffer);

  Serial.println("Telemetry sent:");
  Serial.println(buffer);
}

void setup()
{
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);

  digitalWrite(RELAY_PIN, HIGH);   // RELAY OFF at startup

  connectWiFi();

  wifiClient.setInsecure();

  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
}

void loop()
{
  if (!client.connected())
  {
    connectMQTT();
  }

  client.loop();

  if (chargingActive)
  {
    if (millis() - lastPublish > 5000)
    {
      publishTelemetry();
      lastPublish = millis();
    }
  }
}