# SkyTrace

I have build a live flight tracker web application. It lets the user explore aircrafts and see their information. They can replay the history and aircraft movement. 

#Features

1. Live aircraft tracking on a map
2. Choose the map style you want
3. Can choose whether you want to see the weather
4. Aircraft faces where they are heading
5. Live updates for aircraft information (every 5 seconds)
6. When selected an aircraft a glowing ring comes up
7. Flight search in a particular area(250 nm, because the API only provides this much area for free)
8. Aircraft trails
9. Replay controls
    - Play
    - Pause
    - Restart
    - Speed selection (1x, 2x, 3x)
10. Airport Icon and when clicked it shows the airport info

# Built With

1. JavaScript
2. Vite
3. HTML
4. CSS
5. ADSB.fi (live aircraft data)
6. ADSBDB (live aircraft route)
7. RainViewer
8. HexDB (alternative for aircraft route)
9. Vercel

# How It Works

So what I have made is I think everyone knows about a flight tracker. To use it, what you do is that zoom in an area where you want to see the aircrafts. This is because the free API only provides a radius of 250 nm and that is why this tracker is limited. **When first loaded it will take a while to load because it has to load a lot of aircraft like 1-2 minutes**.
