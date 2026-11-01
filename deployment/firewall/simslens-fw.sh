#!/bin/bash
# Pare-feu SimsLens : ferme depuis Internet le panneau Dokploy (3000) et les ports Swarm
# (2377, 7946, 4789), en IPv4 et IPv6. 22, 80 et 443 ne sont pas concernés.
# Usage : simslens-fw.sh apply | remove | status
# Les règles vivent dans une chaîne dédiée, SIMSLENS-FW, appelée depuis INPUT (ports écoutés
# par l'hôte, et docker-proxy en IPv6) et depuis DOCKER-USER (port 3000 redirigé vers le
# conteneur en IPv4). Les règles gérées par Docker ne sont pas touchées.
set -euo pipefail
IFACE=ens3
CHAIN=SIMSLENS-FW

apply_family() {
  local ipt=$1
  $ipt -N $CHAIN 2>/dev/null || $ipt -F $CHAIN
  $ipt -A $CHAIN -i $IFACE -p tcp -m multiport --dports 2377,7946,3000 -j DROP
  $ipt -A $CHAIN -i $IFACE -p udp -m multiport --dports 7946,4789 -j DROP
  # Après redirection vers un conteneur : seules les nouvelles connexions visant 3000
  $ipt -A $CHAIN -i $IFACE -p tcp -m conntrack --ctstate NEW --ctorigdstport 3000 -j DROP
  $ipt -A $CHAIN -j RETURN
  for parent in INPUT DOCKER-USER; do
    $ipt -C $parent -j $CHAIN 2>/dev/null || $ipt -I $parent 1 -j $CHAIN
  done
}

remove_family() {
  local ipt=$1
  for parent in INPUT DOCKER-USER; do
    while $ipt -D $parent -j $CHAIN 2>/dev/null; do :; done
  done
  $ipt -F $CHAIN 2>/dev/null || true
  $ipt -X $CHAIN 2>/dev/null || true
}

case "${1:-}" in
  apply)  apply_family iptables;  apply_family ip6tables ;;
  remove) remove_family iptables; remove_family ip6tables ;;
  status) for ipt in iptables ip6tables; do echo "## $ipt"; $ipt -S $CHAIN 2>/dev/null || echo "(absente)"; done ;;
  *) echo "Usage : $0 apply|remove|status" >&2; exit 2 ;;
esac
