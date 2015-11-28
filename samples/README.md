## Configuration

Leave out the 'cd' command if you want to localize these to a particular fold

    cd $HOME
    homestar set "/bridges/KNXBridge/initd/host" '192.168.80.101'
    homestar set "/bridges/KNXBridge/initd/port" 3671
    homestar set "/bridges/KNXBridge/initd/tunnel" "udp://0.0.0.0:13671"
