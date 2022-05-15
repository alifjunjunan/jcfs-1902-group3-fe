import { Box, Center, Heading, Image, Text, InputGroup, InputLeftElement, InputRightElement, Input, Icon, Button, Select } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { API_URL } from '../helper'
import { AiOutlineMinus, AiOutlinePlus, AiOutlineDelete } from 'react-icons/ai'
import { deleteCartAction, getAddress, getCartAction, getOngkirAction, getWarehouseAdmin, getTransactionAction, getWarehouseAction, updateQtyCartAction, getProductWarehouseAction } from '../redux/actions'
import ModalSetAlamat from '../Components/ModalSetAlamat'
import axios from 'axios'
import { Navigate } from 'react-router'
import { Pagination } from '@mantine/core'
import { findNearest } from 'geolib'
import Swal from 'sweetalert2'
import GoOnTop from '../Components/GoOnTop'
import BtnOnTop from '../Components/BtnOnTop'
import moment from 'moment'

const CheckoutPage = () => {

    const [openModalAlamat, setOpenModalAlamat] = useState(false)
    const [selectedWarehouse, setSelectedWarehouse] = useState(null)
    const [dataOngkir, setDataOngkir] = useState({})
    const [redirect, setRedirect] = useState(false)
    const [limitData, setLimitData] = useState(4)
    const [page, setPage] = useState(1)
    const [printWarehouse, setPrintWarehouse] = useState([])
    const [valuePrintWarehouse, setValuePrintWarehouse] = useState('')
    const [valueSelectKurir, setValueSelectKurir] = useState('')
    let dispatch = useDispatch()

    const { carts, defaultAlamat } = useSelector((state) => {
        return {
            carts: state.transactionReducer.carts,
            defaultAlamat: state.userReducer.addressList,
        }
    })
    useEffect(() => {
        getWarehouseTerdekat()
    }, [defaultAlamat])

    const btIncrement = (index, idcart) => {
        let temp = [...carts]
        if (temp[index].qty < temp[index].total_stock_product) {
            temp[index].qty += 1
        }
        dispatch(updateQtyCartAction(idcart, { qty: temp[index].qty }))
    }
    const btDecrement = async (index, idcart) => {
        let temp = [...carts]
        if (temp[index].qty > 1) {
            temp[index].qty -= 1
        } else {
            let res = await dispatch(deleteCartAction(idcart))
            if (res.success) {
                setSelectedWarehouse(null)
                setDataOngkir({})
            }
        }
        dispatch(updateQtyCartAction(idcart, { qty: temp[index].qty }))
    }
    const btDeleteCart = async (idcart) => {
        let res = await dispatch(deleteCartAction(idcart))
        if (res.success) {
            setSelectedWarehouse(null)
            setDataOngkir({})
        }
    }
    const printSubtotal = () => {
        let total = 0
        if (carts.length > 0) {
            carts.forEach((item, index) => {
                total += (item.qty * item.products[0].harga)
            })
        }
        return total
    }
    const printProductCart = () => {
        if (carts.length > 0) {
            return carts.slice(page > 1 ? (page - 1) * limitData : page - 1, page * limitData).map((item, index) => {
                return (
                    <>
                        <Box mt='20px' p='4' borderBottom='6px solid #F3F4F5'>
                            <Box display='flex' justifyContent='space-between'>
                                <Box>
                                    <Image src={`${API_URL}/${item.images[0].url}`} boxSize='100px' boxShadow='md' borderRadius='10px' />
                                </Box>
                                <Center>
                                    <Box display='flex'>
                                        <Center>
                                            <Box mx='15px' width={'170px'}>
                                                <Text fontWeight='bold'>{item.products[0].nama}</Text>
                                                <Text mt='10px'>{item.qty} x Rp.{(item.products[0].harga.toLocaleString())}</Text>
                                            </Box>
                                            <Box mr='30px'>
                                                <InputGroup w='98px'>
                                                    <InputLeftElement children={<Icon as={AiOutlineMinus} />} cursor='pointer' onClick={() => btDecrement(index, item.idcart)} />
                                                    <Input value={item.qty} />
                                                    <InputRightElement children={<Icon as={AiOutlinePlus} />} cursor='pointer' onClick={() => btIncrement(index, item.idcart)} />
                                                </InputGroup>
                                            </Box>
                                            <Box>
                                                <Heading as='h6' color='#6B3C3B' size='md'>Rp.{(item.qty * item.products[0].harga).toLocaleString()}</Heading>
                                            </Box>
                                            <Box>
                                                <Icon ml='15px' as={AiOutlineDelete} boxSize='7' cursor='pointer' onClick={() => btDeleteCart(item.idcart)} />
                                            </Box>
                                        </Center>
                                    </Box>
                                </Center>
                            </Box>
                        </Box>
                    </>
                )
            })
        } else {
            return (
                <>
                    <Box mx='10vw' my='50vh'>
                        <Heading as='h2' size='lg'>
                            Belum Ada Barang
                        </Heading>
                    </Box>
                </>
            )
        }
    }
    const printDefaultAlamat = () => {
        if (defaultAlamat.length > 0) {
            return defaultAlamat.map((item, index) => {
                if (item.idstatus === 4) {
                    return (
                        <>
                            <Box mt='20px' borderBottom='2px solid #F3F4F5'>
                                <Text fontWeight='semibold' mb='5px'>{item.nama_penerima}</Text>
                                <Text my='5px'>{item.no_telpon}</Text>
                                <Text my='5px'>{item.provinsi} - {item.kota}</Text>
                                <Text mb='10px' fontSize='13px'>{item.alamat}</Text>
                            </Box>
                        </>
                    )
                }
            })
        } else {
            return (
                <>
                    <Text>Belum ada alamat yang dipilih</Text>
                </>
            )
        }
    }
    const printSelectWarehouse = () => {
        if (printWarehouse.length > 0) {
            return printWarehouse.map((item, index) => {
                return (
                    <option value={index} >{item.nama}</option>
                )
            })
        }
    }
    const getWarehouseTerdekat = async () => {
        try {
            let res = await axios.get(`${API_URL}/warehouse`)
            if (res.data.success) {
                if (defaultAlamat.length > 0) {
                    let alamat = defaultAlamat.filter(item => item.idstatus === 4)
                    let dataCoordWarehouse = []
                    if (res.data.dataWarehouse.length > 0) {
                        res.data.dataWarehouse.forEach((item, index) => {
                            dataCoordWarehouse.push({ latitude: item.latitude, longitude: item.longitude })
                        })
                        let data = findNearest({ latitude: alamat[0].latitude, longitude: alamat[0].longitude }, dataCoordWarehouse)
                        try {
                            let res = await dispatch(getWarehouseAction(data))
                            if (res.success) {
                                setPrintWarehouse(res.data)
                            }
                        } catch (error) {
                            console.log(error)
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
    const selectKurir = async (event) => {
        let temp
        let alamat = defaultAlamat.filter(item => item.idstatus === 4)
        setValueSelectKurir(event.target.value)
        if (alamat && event.target.value) {
            temp = {
                asal: alamat[0].idkota,
                tujuan: selectedWarehouse.idkota,
                berat: carts[0].products[0].berat * 1000,
                kurir: event.target.value
            }
            try {
                let res = await dispatch(getOngkirAction(temp))
                if (res.success) {
                    setDataOngkir(res.data)
                }
            } catch (error) {
                console.log(error)
            }
        }
    }

    const btCheckout = async () => {
        let date = moment().format().slice(0, 19).replace('T', ' ')
        let token = localStorage.getItem('data')
        let alamat = defaultAlamat.filter(item => item.idstatus === 4)
        let data = {
            idwarehouse: selectedWarehouse.idwarehouse,
            idaddress: alamat[0].idaddress,
            idstatus: 6,
            invoice: `INV/${new Date().getTime()}`,
            total_tagihan: Number((printSubtotal() + dataOngkir.costs[1].cost[0].value) + (printSubtotal() * 0.1)),
            ongkir: Number(dataOngkir.costs[1].cost[0].value),
            pajak: Number(printSubtotal() * 0.1),
            added_date: date,
            detail: [...carts]
        }
        try {
            if (token) {
                let res = await axios.post(`${API_URL}/transactions/checkout`, data, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (res.data.success) {
                    dispatch(getCartAction())
                    dispatch(getTransactionAction())
                    dispatch(getProductWarehouseAction())
                    setSelectedWarehouse(null)
                    setDataOngkir({})
                    Swal.fire(
                        'Berhasil!',
                        'Silahkan lakukan pembayaran',
                        'success'
                    )
                    setTimeout(() => {
                        setRedirect(!redirect)
                    }, 600);

                }
            }
            console.log('isi data', data)
        } catch (error) {
            console.log(error)
        }
    }
    const handleLImitData = (event) => {
        setLimitData(event.target.value)
        setPage(1)
    }
    const selectNearWarehouse = (event) => {
        setValuePrintWarehouse(event.target.value)
        setSelectedWarehouse(printWarehouse[event.target.value])
    }
    const btModalAddress = () => {
        setOpenModalAlamat(!openModalAlamat)
        setValuePrintWarehouse('')
        setValueSelectKurir('')
        setSelectedWarehouse(null)
        setDataOngkir({})
    }
    return (
        <>
            {
                redirect && <Navigate to='/payment' />
            }
            <Box marginX={'8vw'} marginY={'5vh'}>
                <Box display='flex' justifyContent='space-between'>
                    <Box >
                        <Heading as='h3' size='lg' mb='40px'>
                            Keranjang
                        </Heading>
                        {printProductCart()}
                        <Box mt='40px' mb='10px' display='flex' justifyContent='center'>
                            <Box display='flex'>
                                <Select w='20' mr='5' onChange={(event) => handleLImitData(event)}>
                                    <option selected value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="15">15</option>
                                    <option value="20">20</option>
                                    <option value="25">25</option>
                                </Select>
                                <Pagination total={Math.ceil(carts.length / limitData)} page={page} onChange={(event) => setPage(event)} size='lg' radius='xl' color='dark' />
                            </Box>
                        </Box>
                    </Box>
                    <Box>
                        <Box w='30vw' borderRadius='15px' boxShadow='md' p='5'>
                            <Box borderBottom='2px solid #F3F4F5'>
                                <Text fontWeight='bold' mb='10px'>Alamat Pengiriman</Text>
                                {printDefaultAlamat()}
                                < Box mt='20px' borderBottom='5px solid #F3F4F5'>
                                    <Button colorScheme='gray' mb='15px' onClick={btModalAddress}>Pilih Alamat Lain</Button>
                                    <ModalSetAlamat openModal={openModalAlamat} closeModal={() => setOpenModalAlamat(!openModalAlamat)} />
                                </Box>
                            </Box>
                            <Box mt='30px' borderBottom='2px solid #F3F4F5'>
                                <Text fontWeight='bold' mb='10px'>Alamat Toko</Text>
                            </Box>
                            {selectedWarehouse &&
                                <Box mt='20px' borderBottom='2px solid #F3F4F5'>
                                    <Text fontWeight='semibold' mb='5px'>{selectedWarehouse.nama}</Text>
                                    <Text my='5px'>{selectedWarehouse.provinsi} - {selectedWarehouse.kota}</Text>
                                    <Text mb='10px' fontSize='13px'>{selectedWarehouse.alamat}</Text>
                                </Box>
                            }
                            <Box mt='20px' borderBottom='5px solid #F3F4F5'>
                                <Select mb='10px' fontWeight='semibold' disabled={carts.length > 0 ? false : true} value={!carts.length ? '' : valuePrintWarehouse} onChange={(event) => selectNearWarehouse(event)}>
                                    <option value='' selected>pilih warehouse</option>
                                    {printSelectWarehouse()}
                                </Select>
                            </Box>
                            <Box mt='20px' borderBottom='2px solid #F3F4F5'>
                                <Text fontWeight='bold' mb='10px'>Kurir Pilihan</Text>
                            </Box>
                            {
                                dataOngkir.costs &&
                                <Box mt='10px' borderBottom='2px solid #F3F4F5'>
                                    <Text>{dataOngkir.name}</Text>
                                    <Text fontSize='13px'>{dataOngkir.costs[1].service} {dataOngkir.costs[1].description} (Rp.{(dataOngkir.costs[1].cost[0].value).toLocaleString()})</Text>
                                    <Text mb='10px' fontSize='12px'>Estimasi {dataOngkir.costs[1].cost[0].etd} hari</Text>
                                </Box>
                            }
                            <Box mt='20px' borderBottom='5px solid #F3F4F5'>
                                <Select mb='10px' fontWeight='semibold' value={!carts.length ? '' : valueSelectKurir} onChange={(event) => selectKurir(event)} disabled={carts.length > 0 ? false : true}>
                                    <option value=''>pilih pengiriman</option>
                                    <option value='jne'>JNE</option>
                                    <option value='tiki'>TIKI</option>
                                </Select>
                            </Box>
                            <Box mt='25px' borderBottom='2px solid #F3F4F5'>
                                <Text fontWeight='bold' mb='10px'>Ringkasan Belanja</Text>
                            </Box>
                            {
                                dataOngkir.costs &&
                                <>
                                    <Box mt='20px' borderBottom='2px solid #F3F4F5'>
                                        <Box display='flex' justifyContent='space-between'>
                                            <Text fontWeight='semibold' mb='10px'>Sub Total</Text>
                                            <Text fontWeight='semibold' mb='10px'>Rp.{printSubtotal().toLocaleString()}</Text>
                                        </Box>
                                        <Box display='flex' justifyContent='space-between'>
                                            <Text fontWeight='semibold' mb='10px'>Pajak 10%</Text>
                                            <Text fontWeight='semibold' mb='10px'>Rp.{(printSubtotal() * 0.1).toLocaleString()}</Text>
                                        </Box>
                                        <Box display='flex' justifyContent='space-between'>
                                            <Text fontWeight='semibold' mb='10px'>Total Ongkos Kirim</Text>
                                            <Text fontWeight='semibold' mb='10px'>Rp.{(dataOngkir.costs[1].cost[0].value).toLocaleString()}</Text>
                                        </Box>
                                    </Box>
                                    <Box mt='15px'>
                                        <Box display='flex' justifyContent='space-between'>
                                            <Text fontWeight='bold' mb='10px'>Total Tagihan</Text>
                                            <Text fontWeight='semibold' mb='10px'>Rp.{((printSubtotal() + dataOngkir.costs[1].cost[0].value) + (printSubtotal() * 0.1)).toLocaleString()}</Text>
                                        </Box>
                                    </Box>
                                </>
                            }
                            <Box mt='15px'>
                                <Center>
                                    {
                                        carts.length > 0 && valueSelectKurir
                                            ?
                                            <Button colorScheme='blackAlpha' bgColor='#6B3C3B' w='100%' onClick={btCheckout}>Checkout</Button>
                                            :
                                            <Button colorScheme='blackAlpha' bgColor='#6B3C3B' w='100%' disabled='true'>Checkout</Button>
                                    }
                                </Center>
                            </Box>
                        </Box>
                    </Box>
                </Box>
                <GoOnTop />
            </Box>
            {/* <BtnOnTop /> */}
        </>
    )
}

export default CheckoutPage