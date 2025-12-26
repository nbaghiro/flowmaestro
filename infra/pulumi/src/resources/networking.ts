import * as gcp from "@pulumi/gcp";
import { infrastructureConfig, resourceName } from "../utils/config";

// Create VPC Network
export const network = new gcp.compute.Network(resourceName("network"), {
    name: resourceName("network"),
    autoCreateSubnetworks: false,
    description: "VPC network for FlowMaestro"
});

// Create subnet for GKE cluster
export const subnet = new gcp.compute.Subnetwork(resourceName("subnet"), {
    name: resourceName("subnet"),
    ipCidrRange: "10.0.0.0/20",
    region: infrastructureConfig.region,
    network: network.id,
    privateIpGoogleAccess: true,
    secondaryIpRanges: [
        {
            rangeName: "pods",
            ipCidrRange: "10.4.0.0/14"
        },
        {
            rangeName: "services",
            ipCidrRange: "10.8.0.0/20"
        }
    ],
    description: "Subnet for GKE cluster"
});

// =============================================================================
// Cloud Router + NAT (only needed for private GKE nodes)
// Saves ~$140/month when using public nodes in dev/staging
// =============================================================================

// Create Cloud Router for NAT (only if using private nodes)
export const router = infrastructureConfig.gkePrivateNodes
    ? new gcp.compute.Router(resourceName("router"), {
          name: resourceName("router"),
          region: infrastructureConfig.region,
          network: network.id,
          description: "Router for Cloud NAT"
      })
    : undefined;

// Create Cloud NAT for outbound traffic from private GKE nodes (only if using private nodes)
export const nat =
    infrastructureConfig.gkePrivateNodes && router
        ? new gcp.compute.RouterNat(resourceName("nat"), {
              name: resourceName("nat"),
              router: router.name,
              region: infrastructureConfig.region,
              natIpAllocateOption: "AUTO_ONLY",
              sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES",
              logConfig: {
                  enable: true,
                  filter: "ERRORS_ONLY"
              }
          })
        : undefined;

// Reserve global static IP for Load Balancer
export const staticIp = new gcp.compute.GlobalAddress(resourceName("static-ip"), {
    name: resourceName("static-ip"),
    description: "Static IP for Load Balancer"
});

// Create private service connection for Cloud SQL and Memorystore
export const privateVpcConnection = new gcp.servicenetworking.Connection(
    resourceName("private-vpc-connection"),
    {
        network: network.id,
        service: "servicenetworking.googleapis.com",
        reservedPeeringRanges: [
            new gcp.compute.GlobalAddress(resourceName("private-ip-range"), {
                name: resourceName("private-ip-range"),
                purpose: "VPC_PEERING",
                addressType: "INTERNAL",
                prefixLength: 16,
                network: network.id
            }).name
        ]
    }
);

// Export network outputs
export const networkOutputs = {
    networkId: network.id,
    networkName: network.name,
    subnetId: subnet.id,
    subnetName: subnet.name,
    staticIpAddress: staticIp.address,
    privateVpcConnectionId: privateVpcConnection.id
};
