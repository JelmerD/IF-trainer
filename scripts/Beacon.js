function Beacon(id) {
    var $this = this;

    /**
     * All the beacons
     *
     * Airport beacons: simply use the airport ARP coordinate as it says in the CENOR FLIP
     *
     * @type {{WDT: {type: string, chan: string, lat: number[], lon: number[]}}}
     */
    var beacons = {
        WDT: {
            name: 'WDT',
            type: 'tacan',
            chan: '97X',
            lat: [51, 26.94],
            lon: [4, 20.53],
        },
        GZR: {
            name: 'GZR',
            type: 'tacan',
            chan: '111X',
            lat: [51, 34.04],
            lon: [4, 55.91],
        },
        LWD: {
            name: 'LWD',
            type: 'tacan',
            chan: '94X',
            lat: [53, 13.52],
            lon: [5, 45.15],
        },
        EHV: {
            name: 'EHV',
            type: 'tacan',
            chan: '119X',
            lat: [51, 27.01],
            lon: [5, 22.47],
        },
        VKL: {
            name: 'VKL',
            type: 'tacan',
            chan: '20X',
            lat: [51, 39.43],
            lon: [5, 42.47],
        }
    };

    // make all the properties accessible
    $this.id = id;
    $this.name = beacons[id].name;
    $this.type = beacons[id].type;
    $this.chan = beacons[id].chan;
    $this.lat = beacons[id].lat;
    $this.lon = beacons[id].lon;
    $this.pos = coordinateToNauticalMile($this.lat, $this.lon);

    $this.off = function() {
        $this.active = false;
    }

    $this.on = function() {
        $this.active = true;
    }

    $this.off();
}