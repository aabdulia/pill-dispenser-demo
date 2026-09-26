// Concept enclosure, millimeters. Designed for visualization, not medication use.
$fn = 48;
W = 150; D = 120; H = 210; wall = 3;

module shell() {
  difference() {
    minkowski() { cube([W-16,D-16,H-8],center=true); sphere(r=8,$fn=24); }
    translate([0,0,5]) cube([W-2*wall,D-2*wall,H-15],center=true);
    // Front face opening for covered medication cup.
    translate([0,-D/2, -H/2+42]) cube([80,30,48],center=true);
  }
}
module front_part() {
  color("#eff5f5") shell();
  // Camera above screen; face points toward the user (-Y).
  color("#172f3c") translate([0,-D/2-1,H/2-36]) rotate([90,0,0]) cylinder(h=3,r=8,center=true);
  color("#446b7b") translate([0,-D/2-2,H/2-36]) rotate([90,0,0]) cylinder(h=4,r=3,center=true);
  color("#102c3a") translate([0,-D/2-2,H/2-82]) cube([100,4,52],center=true);
  color("#0ec6ac") translate([0,-D/2-5,-5]) rotate([90,0,0]) cylinder(h=5,r=15,center=true);
  // Speaker perforations.
  for (i=[-3:3]) color("#6e929c") translate([i*8,-D/2-2,-47]) rotate([90,0,0]) cylinder(h=4,r=1.6,center=true);
  // Removable cup / pill landing tray.
  color("#dae5e8") translate([0,-D/2-11,-H/2+29]) difference() {
    cube([75,42,22],center=true);
    translate([0,0,7]) cube([67,34,16],center=true);
  }
  // Hinged refill hatch indicated as separate surface.
  color("#b8cdd1") translate([0,0,H/2+1]) cube([110,82,3],center=true);
}
front_part();
